#pragma once

#include "simulation.hpp"
#include "websocket.hpp"

class SimulationController
{
public:
    void run(websocket::Connection connection);

private:
    Simulation simulation_;
};
