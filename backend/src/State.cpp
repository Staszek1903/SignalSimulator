#include "../inc/State.hpp"

std::vector<Actions> State::getHandlerByTrigger(std::string trigger){
    auto it = handlersList.find(trigger);
    
    if (it != handlersList.end()) {
        std::cout << "Find trigger! name:" << it->first << ".\n";
        return it->second;
    } else {
        std::cout << "Trigger not exist: " << name << "\n";
        return 0;
    }
}