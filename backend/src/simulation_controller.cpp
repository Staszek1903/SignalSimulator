#include "simulation_controller.hpp"

#include <nlohmann/json.hpp>

#include <chrono>
#include <iostream>
#include <optional>
#include <string>
#include <utility>
#include <vector>

namespace
{
constexpr std::chrono::seconds TICK_INTERVAL{1};

std::optional<std::vector<SimulationObjectDefinition>> parse_project(const nlohmann::json& project)
{
    if (!project.is_object() || !project.contains("objects") || !project.at("objects").is_array()) return std::nullopt;

    std::vector<SimulationObjectDefinition> definitions;
    definitions.reserve(project.at("objects").size());
    for (const auto& object : project.at("objects"))
    {
        if (!object.is_object() || !object.contains("id") || !object.at("id").is_string() ||
            !object.contains("states") || !object.at("states").is_array()) return std::nullopt;

        SimulationObjectDefinition definition;
        definition.id = object.at("id").get<std::string>();
        for (const auto& state : object.at("states"))
        {
            if (!state.is_object() || !state.contains("id") || !state.at("id").is_string()) return std::nullopt;
            definition.states.push_back(state.at("id").get<std::string>());
        }
        if (object.contains("currentState") && object.at("currentState").is_string())
            definition.current_state = object.at("currentState").get<std::string>();
        definitions.push_back(std::move(definition));
    }
    return definitions;
}

nlohmann::json build_state_json(const SimulationState& state)
{
    nlohmann::json message = {{"type", "state"}, {"tick", state.tick}, {"objects", nlohmann::json::array()}};
    for (const auto& object : state.objects)
    {
        message["objects"].push_back({
            {"id", object.id},
            {"currentState", object.current_state ? nlohmann::json(*object.current_state) : nlohmann::json(nullptr)}
        });
    }
    return message;
}
}

void SimulationController::run(websocket::Connection connection)
{
    std::cout << "[BACKEND] Klient " << connection.peer() << ". Oczekiwanie na projekt.\n" << std::flush;
    bool initialized = false;
    auto next_tick = std::chrono::steady_clock::now() + TICK_INTERVAL;

    while (true)
    {
        const auto now = std::chrono::steady_clock::now();
        const auto wait = next_tick > now ? next_tick - now : std::chrono::steady_clock::duration::zero();
        const auto received = connection.receive(std::chrono::duration_cast<std::chrono::milliseconds>(wait));
        if (received.status == websocket::ReceiveStatus::disconnected)
        {
            std::cout << "[BACKEND] Klient rozlaczyl sie.\n" << std::flush;
            return;
        }
        if (received.status == websocket::ReceiveStatus::message)
        {
            const nlohmann::json message = nlohmann::json::parse(received.payload, nullptr, false);
            if (message.is_discarded() || !message.is_object() ||
                !message.contains("type") || !message.at("type").is_string())
            {
                std::cerr << "[BACKEND] Wiadomosc nie jest poprawna koperta protokolu.\n";
                connection.send(R"({"type":"error","message":"Invalid protocol message"})");
                return;
            }

            const std::string message_type = message.at("type").get<std::string>();
            if (message_type == "stop")
            {
                std::cout << "[BACKEND] Odebrano STOP. Zamykanie symulacji.\n" << std::flush;
                connection.close();
                return;
            }
            if (message_type != "initialize" || !message.contains("project"))
            {
                std::cerr << "[BACKEND] Snapshot projektu jest niepoprawny.\n";
                connection.send(R"({"type":"error","message":"Invalid project snapshot"})");
                return;
            }

            auto definitions = parse_project(message.at("project"));
            if (!definitions)
            {
                std::cerr << "[BACKEND] Snapshot projektu jest niepoprawny.\n";
                connection.send(R"({"type":"error","message":"Invalid project snapshot"})");
                return;
            }
            simulation_.initialize(std::move(*definitions));

            initialized = true;
            next_tick = std::chrono::steady_clock::now() + TICK_INTERVAL;
            if (!connection.send(R"({"type":"ready"})")) return;
            std::cout << "[BACKEND] Symulacja uruchomiona.\n" << std::flush;
        }

        if (initialized && std::chrono::steady_clock::now() >= next_tick)
        {
            if (!connection.send(build_state_json(simulation_.advance()).dump()))
            {
                std::cerr << "[BACKEND] Nie udalo sie wyslac ticka. Koniec polaczenia.\n";
                return;
            }
            next_tick += TICK_INTERVAL;
        }
    }
}
