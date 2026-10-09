#include "dispatcher.hpp"

#include <barrier>
#include <chrono>
#include <future>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

using namespace std::chrono_literals;

namespace
{
void require(bool condition, const char* message)
{
    if (!condition) throw std::runtime_error(message);
}

template<class Exception, class Action>
void expectThrow(Action action)
{
    try { action(); }
    catch (const Exception&) { return; }
    throw std::runtime_error("Expected exception was not thrown");
}

MsgPayload bytes()
{
    return MsgPayload(new const std::byte[2]{std::byte{0x12}, std::byte{0x34}});
}

class MockMailbox : public IMailbox
{
public:
    explicit MockMailbox(MessageId id) : id_(id) {}
    MessageId getMsgId() const noexcept override { return id_; }

    bool full = false;
    bool throw_after_move = false;
    MsgPayload received;
    std::size_t received_size = 0;
    unsigned calls = 0;

    bool tryReceive(MsgPayload&& payload, std::size_t size) override
    {
        ++calls;
        if (full) return false;
        received = std::move(payload);
        received_size = size;
        if (throw_after_move) throw std::runtime_error("mailbox failure");
        return true;
    }

private:
    const MessageId id_;
};

class BlockingMailbox : public IMailbox
{
public:
    explicit BlockingMailbox(MessageId id) : id_(id), release_(release_promise.get_future()) {}
    MessageId getMsgId() const noexcept override { return id_; }
    std::promise<void> entered;
    std::promise<void> release_promise;

    bool tryReceive(MsgPayload&& payload, std::size_t) override
    {
        entered.set_value();
        if (release_.wait_for(5s) != std::future_status::ready)
            throw std::runtime_error("Timed out waiting to release mailbox");
        received_ = std::move(payload);
        return true;
    }

private:
    const MessageId id_;
    std::future<void> release_;
    MsgPayload received_;
};

void ownership()
{
    Dispatcher dispatcher;
    auto mailbox = std::make_shared<MockMailbox>(0);
    dispatcher.subscribe(mailbox);
    auto payload = bytes();
    const auto* original = payload.get();
    mailbox->full = true;
    require(!dispatcher.trySend(0, std::move(payload), 2), "Full mailbox accepted");
    require(payload.get() == original && payload[1] == std::byte{0x34}, "Full mailbox changed payload");
    mailbox->full = false;
    require(dispatcher.trySend(0, std::move(payload), 2), "Delivery failed");
    require(!payload && mailbox->received.get() == original, "Ownership was not transferred");
    require(mailbox->received_size == 2 && mailbox->received[0] == std::byte{0x12}, "Data or size changed");

    MsgPayload empty;
    require(dispatcher.trySend(0, std::move(empty), 0), "Null empty message rejected");
    auto allocated_empty = bytes();
    const auto* empty_address = allocated_empty.get();
    require(dispatcher.trySend(0, std::move(allocated_empty), 0), "Allocated empty message rejected");
    require(!allocated_empty && mailbox->received.get() == empty_address, "Empty ownership not transferred");
}

void validation()
{
    Dispatcher dispatcher;
    expectThrow<std::invalid_argument>([&] { dispatcher.subscribe(nullptr); });
    auto mailbox = std::make_shared<MockMailbox>(1);
    dispatcher.subscribe(mailbox);
    expectThrow<DuplicateMessageId>([&] { dispatcher.subscribe(mailbox); });
    auto other = std::make_shared<MockMailbox>(1);
    expectThrow<DuplicateMessageId>([&] { dispatcher.subscribe(other); });
    auto payload = bytes();
    const auto* original = payload.get();
    expectThrow<UnknownMessageId>([&] { (void)dispatcher.trySend(999, std::move(payload), 2); });
    require(payload.get() == original, "Unknown ID consumed payload");
    MsgPayload null;
    expectThrow<std::invalid_argument>([&] { (void)dispatcher.trySend(1, std::move(null), 2); });
    require(dispatcher.trySend(1, std::move(payload), 2), "Original route lost");
    require(mailbox->calls == 1 && other->calls == 0, "Duplicate replaced destination");
}

void lifetime()
{
    std::weak_ptr<IMailbox> observer;
    {
        Dispatcher dispatcher;
        auto mailbox = std::make_shared<MockMailbox>(0);
        observer = mailbox;
        dispatcher.subscribe(mailbox);
        mailbox.reset();
        require(!observer.expired(), "Dispatcher did not retain mailbox");
        auto payload = bytes();
        require(dispatcher.trySend(0, std::move(payload), 2), "Retained mailbox unavailable");
    }
    require(observer.expired(), "Mailbox leaked after destruction");
}

void exceptions()
{
    Dispatcher dispatcher;
    auto mailbox = std::make_shared<MockMailbox>(0);
    dispatcher.subscribe(mailbox);
    mailbox->throw_after_move = true;
    auto payload = bytes();
    bool caught = false;
    try { (void)dispatcher.trySend(0, std::move(payload), 2); }
    catch (const std::runtime_error& error)
    {
        caught = std::string(error.what()) == "mailbox failure";
    }
    require(caught, "Mailbox exception did not propagate unchanged");
    mailbox->throw_after_move = false;
    auto next = bytes();
    require(dispatcher.trySend(0, std::move(next), 2), "Exception left route busy");
}

void concurrentSends()
{
    Dispatcher dispatcher;
    auto blocked = std::make_shared<BlockingMailbox>(0);
    auto independent = std::make_shared<MockMailbox>(1);
    dispatcher.subscribe(blocked);
    dispatcher.subscribe(independent);
    auto entered = blocked->entered.get_future();
    auto first = std::async(std::launch::async, [&] {
        auto payload = bytes();
        return dispatcher.trySend(0, std::move(payload), 2) && !payload;
    });
    require(entered.wait_for(3s) == std::future_status::ready, "First sender did not enter");

    auto contender = std::async(std::launch::async, [&] {
        auto payload = bytes();
        const auto* original = payload.get();
        return !dispatcher.trySend(0, std::move(payload), 2) && payload.get() == original;
    });
    auto separate = std::async(std::launch::async, [&] {
        auto payload = bytes();
        return dispatcher.trySend(1, std::move(payload), 2) && !payload;
    });
    const bool contender_ready = contender.wait_for(1s) == std::future_status::ready;
    const bool separate_ready = separate.wait_for(1s) == std::future_status::ready;
    blocked->release_promise.set_value();
    require(contender_ready && contender.get(), "Busy send blocked or consumed payload");
    require(separate_ready && separate.get(), "Different mailbox could not proceed concurrently");
    require(first.get(), "First delivery failed");
}

void registrationDuringSend()
{
    Dispatcher dispatcher;
    auto blocked = std::make_shared<BlockingMailbox>(0);
    dispatcher.subscribe(blocked);
    auto entered = blocked->entered.get_future();
    auto first = std::async(std::launch::async, [&] {
        auto payload = bytes();
        return dispatcher.trySend(0, std::move(payload), 2);
    });
    require(entered.wait_for(3s) == std::future_status::ready, "Sender did not enter");
    auto registration = std::async(std::launch::async, [&] {
        for (MessageId id = 1; id <= 1024; ++id)
        {
            dispatcher.subscribe(std::make_shared<MockMailbox>(id));
            auto payload = bytes();
            require(dispatcher.trySend(id, std::move(payload), 2), "New route unavailable");
        }
    });
    const bool ready = registration.wait_for(3s) == std::future_status::ready;
    blocked->release_promise.set_value();
    registration.get();
    require(ready, "Active send prevented registration");
    require(first.get(), "Route pointer invalidated during growth");
}

void concurrentRegistration()
{
    Dispatcher dispatcher;
    constexpr int count = 8;
    std::barrier start(count);
    std::vector<std::future<bool>> attempts;
    for (int i = 0; i < count; ++i)
        attempts.push_back(std::async(std::launch::async, [&] {
            auto mailbox = std::make_shared<MockMailbox>(42);
            start.arrive_and_wait();
            try { dispatcher.subscribe(mailbox); return true; }
            catch (const DuplicateMessageId&) { return false; }
        }));
    int winners = 0;
    for (auto& attempt : attempts) winners += attempt.get() ? 1 : 0;
    require(winners == 1, "Concurrent registration did not have exactly one winner");
    auto payload = bytes();
    require(dispatcher.trySend(42, std::move(payload), 2), "Winning route unavailable");
}
}

int main(int argc, char** argv)
{
    try
    {
        require(argc == 2, "Pass a test name");
        const std::string name = argv[1];
        if (name == "ownership") ownership();
        else if (name == "validation") validation();
        else if (name == "lifetime") lifetime();
        else if (name == "exceptions") exceptions();
        else if (name == "concurrent_sends") concurrentSends();
        else if (name == "registration_during_send") registrationDuringSend();
        else if (name == "concurrent_registration") concurrentRegistration();
        else throw std::runtime_error("Unknown test name");
    }
    catch (const std::exception& error)
    {
        std::cerr << error.what() << '\n';
        return 1;
    }
}
