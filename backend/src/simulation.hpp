#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <vector>

struct SimulationObjectDefinition
{
    std::string id;
    std::vector<std::string> states;
    std::optional<std::string> current_state;
};

struct SimulationObjectState
{
    std::string id;
    std::optional<std::string> current_state;
};

struct SimulationState
{
    std::size_t tick{0};
    std::vector<SimulationObjectState> objects;
};

class Simulation
{
public:
    void initialize(std::vector<SimulationObjectDefinition> objects);
    SimulationState advance();

private:
    struct SimulationObject
    {
        std::string id;
        std::vector<std::string> states;
        std::size_t current_index{0};
    };

    std::vector<SimulationObject> objects_;
    std::size_t tick_{0};
};
