#include "websocket.hpp"

#include <winsock2.h>
#include <ws2tcpip.h>

#include <algorithm>
#include <array>
#include <cctype>
#include <cstdint>
#include <iostream>
#include <optional>
#include <stdexcept>
#include <utility>
#include <vector>

namespace websocket
{
namespace
{
constexpr std::size_t MAX_HEADER_SIZE = 64 * 1024;
constexpr std::size_t MAX_PAYLOAD_SIZE = 1024 * 1024;
constexpr std::string_view WEBSOCKET_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

std::runtime_error socket_error(std::string_view message)
{
    return std::runtime_error(std::string(message) + " (Winsock " + std::to_string(WSAGetLastError()) + ")");
}

std::string lowercase(std::string value)
{
    std::transform(value.begin(), value.end(), value.begin(), [](unsigned char character) {
        return static_cast<char>(std::tolower(character));
    });
    return value;
}

std::optional<std::string> header_value(std::string_view headers, std::string_view wanted_name)
{
    std::size_t line_begin = 0;
    while (line_begin < headers.size())
    {
        const auto line_end = headers.find("\r\n", line_begin);
        const auto line = headers.substr(line_begin, line_end == std::string_view::npos ? headers.size() - line_begin : line_end - line_begin);
        const auto colon = line.find(':');
        if (colon != std::string_view::npos && lowercase(std::string(line.substr(0, colon))) == lowercase(std::string(wanted_name)))
        {
            const auto begin = line.find_first_not_of(" \t", colon + 1);
            const auto end = line.find_last_not_of(" \t");
            if (begin != std::string_view::npos) return std::string(line.substr(begin, end - begin + 1));
        }
        if (line_end == std::string_view::npos) break;
        line_begin = line_end + 2;
    }
    return std::nullopt;
}

std::uint32_t rotate_left(std::uint32_t value, unsigned count)
{
    return (value << count) | (value >> (32 - count));
}

std::array<unsigned char, 20> sha1(std::string_view input)
{
    std::vector<unsigned char> data(input.begin(), input.end());
    const std::uint64_t bit_length = static_cast<std::uint64_t>(data.size()) * 8;
    data.push_back(0x80);
    while ((data.size() % 64) != 56) data.push_back(0);
    for (int shift = 56; shift >= 0; shift -= 8) data.push_back(static_cast<unsigned char>((bit_length >> shift) & 0xff));
    std::uint32_t h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
    for (std::size_t block = 0; block < data.size(); block += 64)
    {
        std::uint32_t words[80]{};
        for (int index = 0; index < 16; ++index)
        {
            const auto offset = block + static_cast<std::size_t>(index * 4);
            words[index] = (static_cast<std::uint32_t>(data[offset]) << 24) |
                (static_cast<std::uint32_t>(data[offset + 1]) << 16) |
                (static_cast<std::uint32_t>(data[offset + 2]) << 8) | data[offset + 3];
        }
        for (int index = 16; index < 80; ++index) words[index] = rotate_left(words[index - 3] ^ words[index - 8] ^ words[index - 14] ^ words[index - 16], 1);
        std::uint32_t a = h0, b = h1, c = h2, d = h3, e = h4;
        for (int index = 0; index < 80; ++index)
        {
            std::uint32_t function = 0, constant = 0;
            if (index < 20) { function = (b & c) | ((~b) & d); constant = 0x5a827999; }
            else if (index < 40) { function = b ^ c ^ d; constant = 0x6ed9eba1; }
            else if (index < 60) { function = (b & c) | (b & d) | (c & d); constant = 0x8f1bbcdc; }
            else { function = b ^ c ^ d; constant = 0xca62c1d6; }
            const std::uint32_t temporary = rotate_left(a, 5) + function + e + constant + words[index];
            e = d; d = c; c = rotate_left(b, 30); b = a; a = temporary;
        }
        h0 += a; h1 += b; h2 += c; h3 += d; h4 += e;
    }
    std::array<unsigned char, 20> digest{};
    const std::uint32_t hashes[] = {h0, h1, h2, h3, h4};
    for (int index = 0; index < 5; ++index)
        for (int byte = 0; byte < 4; ++byte) digest[index * 4 + byte] = static_cast<unsigned char>((hashes[index] >> (24 - byte * 8)) & 0xff);
    return digest;
}

std::string base64(const std::array<unsigned char, 20>& data)
{
    constexpr std::string_view ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    std::string output;
    for (std::size_t index = 0; index < data.size(); index += 3)
    {
        const std::uint32_t value = (static_cast<std::uint32_t>(data[index]) << 16) |
            (index + 1 < data.size() ? static_cast<std::uint32_t>(data[index + 1]) << 8 : 0) |
            (index + 2 < data.size() ? data[index + 2] : 0);
        output.push_back(ALPHABET[(value >> 18) & 63]);
        output.push_back(ALPHABET[(value >> 12) & 63]);
        output.push_back(index + 1 < data.size() ? ALPHABET[(value >> 6) & 63] : '=');
        output.push_back(index + 2 < data.size() ? ALPHABET[value & 63] : '=');
    }
    return output;
}

bool send_all(SOCKET socket, std::string_view data)
{
    std::size_t total = 0;
    while (total < data.size())
    {
        const int sent = ::send(socket, data.data() + total, static_cast<int>(data.size() - total), 0);
        if (sent == SOCKET_ERROR || sent == 0) return false;
        total += static_cast<std::size_t>(sent);
    }
    return true;
}

bool receive_exact(SOCKET socket, char* destination, std::size_t size)
{
    std::size_t total = 0;
    while (total < size)
    {
        const int received = recv(socket, destination + total, static_cast<int>(size - total), 0);
        if (received <= 0) return false;
        total += static_cast<std::size_t>(received);
    }
    return true;
}

std::optional<std::string> receive_http_request(SOCKET socket)
{
    std::string request;
    char buffer[2048];
    while (request.find("\r\n\r\n") == std::string::npos)
    {
        const int received = recv(socket, buffer, sizeof(buffer), 0);
        if (received <= 0) return std::nullopt;
        request.append(buffer, static_cast<std::size_t>(received));
        if (request.size() > MAX_HEADER_SIZE) return std::nullopt;
    }
    return request;
}

bool upgrade(SOCKET socket, std::string_view request, std::string_view path)
{
    const auto first_line_end = request.find("\r\n");
    const auto first_line = request.substr(0, first_line_end);
    if (!first_line.starts_with("GET " + std::string(path) + " ") || lowercase(std::string(request)).find("upgrade: websocket") == std::string::npos) return false;
    const auto key = header_value(request, "sec-websocket-key");
    if (!key) return false;
    const std::string accept = base64(sha1(*key + std::string(WEBSOCKET_GUID)));
    return send_all(socket, "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + accept + "\r\n\r\n");
}

void log_payload(std::string_view direction, std::string_view payload)
{
    std::cout << "[WS][" << direction << "] " << payload.size() << " B: " << payload << '\n' << std::flush;
}
} // namespace

struct Connection::Implementation
{
    SOCKET socket{INVALID_SOCKET};
    std::string peer;
    bool close_sent{false};

    ~Implementation()
    {
        if (socket != INVALID_SOCKET) closesocket(socket);
    }
};

struct Server::Implementation
{
    SOCKET socket{INVALID_SOCKET};
    std::string path;
    bool winsock_started{false};

    ~Implementation()
    {
        if (socket != INVALID_SOCKET) closesocket(socket);
        if (winsock_started) WSACleanup();
    }
};

Connection::Connection(std::unique_ptr<Implementation> implementation) : implementation_(std::move(implementation)) {}
Connection::Connection(Connection&&) noexcept = default;
Connection& Connection::operator=(Connection&&) noexcept = default;

Connection::~Connection() = default;

ReceiveResult Connection::receive(std::chrono::milliseconds timeout)
{
    if (!implementation_ || implementation_->socket == INVALID_SOCKET) return {};
    const auto count = std::max<std::int64_t>(0, timeout.count());
    timeval wait{static_cast<long>(count / 1000), static_cast<long>((count % 1000) * 1000)};
    fd_set readable;
    FD_ZERO(&readable);
    FD_SET(implementation_->socket, &readable);
    const int ready = select(0, &readable, nullptr, nullptr, &wait);
    if (ready == 0) return {ReceiveStatus::timeout, {}};
    if (ready == SOCKET_ERROR) return {};

    unsigned char header[2]{};
    if (!receive_exact(implementation_->socket, reinterpret_cast<char*>(header), 2)) return {};
    const unsigned opcode = header[0] & 0x0f;
    if (opcode == 0x8 || opcode != 0x1 || (header[1] & 0x80) == 0) return {};
    std::uint64_t length = header[1] & 0x7f;
    if (length == 126)
    {
        unsigned char extended[2]{};
        if (!receive_exact(implementation_->socket, reinterpret_cast<char*>(extended), 2)) return {};
        length = (static_cast<std::uint64_t>(extended[0]) << 8) | extended[1];
    }
    else if (length == 127)
    {
        unsigned char extended[8]{};
        if (!receive_exact(implementation_->socket, reinterpret_cast<char*>(extended), 8)) return {};
        length = 0;
        for (const auto byte : extended) length = (length << 8) | byte;
    }
    if (length > MAX_PAYLOAD_SIZE) return {};
    unsigned char mask[4]{};
    if (!receive_exact(implementation_->socket, reinterpret_cast<char*>(mask), 4)) return {};
    std::string payload(static_cast<std::size_t>(length), '\0');
    if (length && !receive_exact(implementation_->socket, payload.data(), payload.size())) return {};
    for (std::size_t index = 0; index < payload.size(); ++index) payload[index] ^= static_cast<char>(mask[index % 4]);
    log_payload("RX", payload);
    return {ReceiveStatus::message, std::move(payload)};
}

bool Connection::send(std::string_view payload)
{
    if (!implementation_ || implementation_->socket == INVALID_SOCKET) return false;
    std::string frame(1, static_cast<char>(0x81));
    if (payload.size() < 126) frame.push_back(static_cast<char>(payload.size()));
    else if (payload.size() <= 0xffff)
    {
        frame.push_back(126);
        frame.push_back(static_cast<char>((payload.size() >> 8) & 0xff));
        frame.push_back(static_cast<char>(payload.size() & 0xff));
    }
    else
    {
        frame.push_back(127);
        for (int shift = 56; shift >= 0; shift -= 8) frame.push_back(static_cast<char>((static_cast<std::uint64_t>(payload.size()) >> shift) & 0xff));
    }
    frame.append(payload);
    const bool sent = send_all(implementation_->socket, frame);
    if (sent) log_payload("TX", payload);
    return sent;
}

void Connection::close()
{
    if (!implementation_ || implementation_->socket == INVALID_SOCKET || implementation_->close_sent) return;
    const char frame[] = {static_cast<char>(0x88), 0x00};
    if (send_all(implementation_->socket, std::string_view(frame, sizeof(frame)))) std::cout << "[WS][TX] CLOSE\n" << std::flush;
    implementation_->close_sent = true;
}

std::string Connection::peer() const
{
    return implementation_ ? implementation_->peer : std::string{};
}

Server::Server(unsigned short port, std::string path) : implementation_(std::make_unique<Implementation>())
{
    implementation_->path = std::move(path);
    WSADATA data{};
    if (WSAStartup(MAKEWORD(2, 2), &data) != 0) throw socket_error("Nie mozna uruchomic Winsock");
    implementation_->winsock_started = true;
    implementation_->socket = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (implementation_->socket == INVALID_SOCKET) throw socket_error("Nie mozna utworzyc gniazda serwera");
    sockaddr_in address{};
    address.sin_family = AF_INET;
    address.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    address.sin_port = htons(port);
    if (bind(implementation_->socket, reinterpret_cast<const sockaddr*>(&address), sizeof(address)) == SOCKET_ERROR ||
        listen(implementation_->socket, SOMAXCONN) == SOCKET_ERROR)
        throw socket_error("Nie mozna uruchomic serwera WebSocket na porcie " + std::to_string(port));
    std::cout << "WebSocket nasluchuje na ws://localhost:" << port << implementation_->path << '\n' << std::flush;
}

Server::~Server() = default;

Connection Server::accept()
{
    while (true)
    {
        sockaddr_in address{};
        int address_size = sizeof(address);
        const SOCKET client = ::accept(implementation_->socket, reinterpret_cast<sockaddr*>(&address), &address_size);
        if (client == INVALID_SOCKET) throw socket_error("Nie mozna zaakceptowac polaczenia");
        char ip[INET_ADDRSTRLEN]{};
        inet_ntop(AF_INET, &address.sin_addr, ip, sizeof(ip));
        const std::string peer = std::string(ip) + ':' + std::to_string(ntohs(address.sin_port));
        const auto request = receive_http_request(client);
        if (!request || !upgrade(client, *request, implementation_->path))
        {
            closesocket(client);
            continue;
        }
        auto connection_data = std::make_unique<Connection::Implementation>();
        connection_data->socket = client;
        connection_data->peer = peer;
        std::cout << "[WS] Polaczono: " << peer << '\n' << std::flush;
        return Connection(std::move(connection_data));
    }
}
} // namespace websocket
