#include "dispatcher.hpp"

#include <mutex>
#include <utility>

namespace
{
class SendGuard
{
public:
    explicit SendGuard(std::atomic_flag& flag) noexcept : flag_(flag) {}
    ~SendGuard() { flag_.clear(std::memory_order_release); }
    SendGuard(const SendGuard&) = delete;
    SendGuard& operator=(const SendGuard&) = delete;

private:
    std::atomic_flag& flag_;
};
}

Dispatcher::Route::Route(std::shared_ptr<IMailbox> destination)
    : mailbox(std::move(destination))
{
}

Dispatcher::Dispatcher()
{
    // Work around the installed MinGW mutex first-use race; see docs/dispatcher.md.
    const std::unique_lock lock(routes_mutex_);
}

void Dispatcher::subscribe(std::shared_ptr<IMailbox> mailbox)
{
    if (!mailbox)
        throw std::invalid_argument("Mailbox must not be null");

    const MessageId id = mailbox->getMsgId();
    std::unique_lock lock(routes_mutex_);
    const bool inserted = routes_.try_emplace(id, std::move(mailbox)).second;
    if (!inserted)
        throw DuplicateMessageId("Message ID is already registered");
}

bool Dispatcher::trySend(MessageId id, MsgPayload&& payload, std::size_t size)
{
    if (!payload && size != 0)
        throw std::invalid_argument("Nonempty payload must not be null");

    Route* route;
    {
        std::shared_lock lock(routes_mutex_);
        const auto found = routes_.find(id);
        if (found == routes_.end())
            throw UnknownMessageId("Message ID is not registered");
        route = &found->second;
    }
    if (route->sending.test_and_set(std::memory_order_acquire))
        return false;

    const SendGuard guard(route->sending);
    return route->mailbox->tryReceive(std::move(payload), size);
}
