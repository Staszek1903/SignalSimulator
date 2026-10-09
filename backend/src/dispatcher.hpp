#pragma once

#include "mailbox.hpp"

#include <atomic>
#include <shared_mutex>
#include <stdexcept>
#include <unordered_map>

class UnknownMessageId : public std::out_of_range
{
public:
    using std::out_of_range::out_of_range;
};

class DuplicateMessageId : public std::logic_error
{
public:
    using std::logic_error::logic_error;
};
class Dispatcher
{
public:
    Dispatcher();
    void subscribe(std::shared_ptr<IMailbox> mailbox);
    [[nodiscard]] bool trySend(MessageId id, MsgPayload&& payload, std::size_t size);

private:
    struct Route
    {
        explicit Route(std::shared_ptr<IMailbox> destination);
        std::shared_ptr<IMailbox> mailbox;
        std::atomic_flag sending = ATOMIC_FLAG_INIT;
    };

    std::shared_mutex routes_mutex_;
    std::unordered_map<MessageId, Route> routes_;
};
