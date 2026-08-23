#pragma once

#include <chrono>
#include <memory>
#include <string>
#include <string_view>

namespace websocket
{
enum class ReceiveStatus { message, timeout, disconnected };

struct ReceiveResult
{
    ReceiveStatus status{ReceiveStatus::disconnected};
    std::string payload;
};

class Connection
{
public:
    Connection(Connection&&) noexcept;
    Connection& operator=(Connection&&) noexcept;
    ~Connection();

    Connection(const Connection&) = delete;
    Connection& operator=(const Connection&) = delete;

    ReceiveResult receive(std::chrono::milliseconds timeout);
    bool send(std::string_view payload);
    void close();
    std::string peer() const;

private:
    struct Implementation;
    explicit Connection(std::unique_ptr<Implementation> implementation);
    std::unique_ptr<Implementation> implementation_;
    friend class Server;
};

class Server
{
public:
    explicit Server(unsigned short port, std::string path = "/ws");
    ~Server();

    Server(const Server&) = delete;
    Server& operator=(const Server&) = delete;

    Connection accept();

private:
    struct Implementation;
    std::unique_ptr<Implementation> implementation_;
};
} // namespace websocket
