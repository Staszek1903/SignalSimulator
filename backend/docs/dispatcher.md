# Dispatcher

The standalone C++20 dispatcher routes immutable byte buffers to mailbox interfaces.
The application uses one dispatcher. Concrete mailboxes and simulation restart
handling are responsibilities of the application.

## Interface

- MessageId is std::uint32_t.
- MsgPayload is std::unique_ptr<const std::byte[]>.
- IMailbox::getMsgId() const noexcept returns a fixed ID for the mailbox's entire
  lifetime and must support concurrent calls.
- IMailbox::tryReceive(MsgPayload&&, std::size_t) receives only the payload and size.
- Dispatcher::subscribe(std::shared_ptr<IMailbox>) registers the mailbox's ID.
- Dispatcher::trySend(MessageId, MsgPayload&&, std::size_t) attempts delivery.

## Registration and lifetime

Each ID has exactly one mailbox. An immutable mailbox ID prevents registering that
mailbox under another ID. Registration is permanent; there is no replacement or
unsubscribe operation.

The dispatcher shares ownership of registered mailboxes. Stop and join every
thread using the dispatcher before destroying it.

A null mailbox throws std::invalid_argument. An already registered ID throws
DuplicateMessageId, derived from std::logic_error. Allocation failures propagate
without adding a route.

## Sending and ownership

Pass the owning pointer with std::move and pass its size separately. The move
expression itself does not transfer ownership.

| Outcome | Result | Ownership |
| --- | --- | --- |
| Accepted | true | Mailbox takes ownership without copying bytes |
| Mailbox full | false | Caller retains the unchanged payload |
| Another sender active on the route | false | Caller retains the unchanged payload |
| ID not registered | UnknownMessageId, derived from std::out_of_range | Payload has not been passed to the mailbox |
| Null pointer with nonzero size | std::invalid_argument | Payload has not been passed to the mailbox |
| Mailbox throws | Original exception propagates | Unspecified |

Payload validation precedes ID lookup. Empty messages are accepted, including a
null pointer with zero size. The caller must supply a valid buffer size; the
dispatcher cannot verify allocation length. Callers must not modify the bytes
through retained mutable aliases after successful delivery.

The mailbox must preserve the payload when returning false. Exceptions are fatal
to the current simulation under the application policy, so payload recovery on
exception is not required. The dispatcher propagates exceptions; it does not
restart the simulation itself.

Recursive sending to the same mailbox is caller misuse. In particular, retrying
inside the active receive call cannot succeed until that call returns.

## Synchronization and storage

Registration takes an exclusive routing lock. Sending takes a shared lock only
long enough to look up the route, then releases it before calling mailbox code.
Sending may wait for registration; it does not wait for mailbox space or another
sender to finish.

Routes are stored directly in std::unordered_map<MessageId, Route> and constructed
in place with try_emplace. Pointers to elements survive rehashing. Because routes
are never erased and destruction waits for all callers, sending can use a raw
route pointer after releasing the routing lock. No shared-pointer reference count
is updated for each send.

Each route has an atomic_flag. test_and_set with acquire ordering admits one
sender; other senders return false. An RAII guard clears the flag with release
ordering on both normal return and exception. Different mailboxes can receive
concurrently. Receiver synchronization belongs to the mailbox implementation.

## MinGW first-use workaround

With the installed MSYS2 MinGW GCC 11.2.0 toolchain, simultaneous first use of a
shared mutex failed mutual exclusion in an isolated probe (86 of 100 trials).
Locking and unlocking it before publishing it to worker threads eliminated the
failure in that probe.

Dispatcher construction therefore acquires and releases the routing mutex once.
Do not remove this initialization without verifying the supported runtime and the
concurrent-registration regression test. After this workaround, that test passed
100 consecutive runs on the affected environment.

## Tests

From the backend directory:

    cmake --preset debug
    cmake --build --preset debug
    ctest --test-dir build/debug-mingw --output-on-failure

The seven CTest cases cover ownership and empty messages, validation and duplicate
registration, mailbox lifetime, exception propagation and busy-flag cleanup,
same/different-mailbox concurrent sends, registration during an active send, and
concurrent registration of the same ID.

Concurrency tests coordinate threads explicitly and use bounded waits plus a
CTest timeout. Passing them validates these scenarios, not every possible thread
schedule.
