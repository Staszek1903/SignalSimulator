#include "simulation.hpp"

#include <algorithm>
#include <iostream>
#include <utility>

void Simulation::initialize(std::vector<SimulationObjectDefinition> definitions)
{
    std::vector<SimulationObject> parsed_objects;
    parsed_objects.reserve(definitions.size());
    for (auto& definition : definitions)
    {
        SimulationObject parsed_object;
        parsed_object.id = std::move(definition.id);
        parsed_object.states = std::move(definition.states);
        if (definition.current_state)
        {
            const auto match = std::find(parsed_object.states.begin(), parsed_object.states.end(), *definition.current_state);
            if (match != parsed_object.states.end())
                parsed_object.current_index = static_cast<std::size_t>(match - parsed_object.states.begin());
        }
        parsed_objects.push_back(std::move(parsed_object));
    }

    objects_ = std::move(parsed_objects);
    tick_ = 0;
    std::cout << "[SYMULACJA] Zainicjalizowano projekt: " << objects_.size() << " obiektow.\n";
    for (const auto& object : objects_)
    {
        std::cout << "  - " << object.id << ": " << object.states.size() << " stanow, start = ";
        if (object.states.empty()) std::cout << "brak";
        else std::cout << object.states[object.current_index];
        std::cout << '\n';
    }
    std::cout << std::flush;
}

SimulationState Simulation::advance()
{
    ++tick_;
    std::cout << "[TICK " << tick_ << "] Przesuwanie stanow:\n";
    SimulationState state{tick_, {}};
    state.objects.reserve(objects_.size());
    for (auto& object : objects_)
    {
        if (!object.states.empty())
        {
            const std::string previous_state = object.states[object.current_index];
            object.current_index = (object.current_index + 1) % object.states.size();
            std::cout << "  - " << object.id << ": " << previous_state << " -> " << object.states[object.current_index] << '\n';
        }
        else
        {
            std::cout << "  - " << object.id << ": brak zdefiniowanych stanow\n";
        }
        state.objects.push_back({
            object.id,
            object.states.empty() ? std::nullopt : std::optional<std::string>(object.states[object.current_index])
        });
    }
    std::cout << "[TICK " << tick_ << "] Wysylanie aktualizacji do frontendu.\n" << std::flush;
    return state;
}
