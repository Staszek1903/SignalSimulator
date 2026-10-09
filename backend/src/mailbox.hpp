#pragma once

#include <cstddef>
#include <cstdint>
#include <memory>

using MessageId = std::uint32_t;
using MsgPayload = std::unique_ptr<const std::byte[]>;

class IMailbox
{
public:
    virtual ~IMailbox() = default;
    virtual MessageId getMsgId() const noexcept = 0;
    virtual bool tryReceive(MsgPayload&& payload, std::size_t size) = 0;
};
