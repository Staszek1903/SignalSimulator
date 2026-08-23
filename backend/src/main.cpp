#include "simulation_controller.hpp"
#include "websocket.hpp"

#include <exception>
#include <iostream>

namespace
{
constexpr unsigned short SERVER_PORT = 8080;
}

int main()
{
    try
    {
        websocket::Server server(SERVER_PORT);
        while (true)
        {
            SimulationController controller;
            controller.run(server.accept());
        }
    }
    catch (const std::exception& error)
    {
        std::cerr << "Blad backendu: " << error.what() << '\n';
        return 1;
    }
}
