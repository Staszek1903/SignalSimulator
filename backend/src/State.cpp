#include <iostream>
#include "backend/inc/State.hpp"

std::vector<State::Action>& State::getHandlerByTrigger(const std::string& trigger){
    return handlersList[trigger];
}

void State::addEmptyTrigger(const std::string& trigger) {
    if (handlersList.find(trigger) == handlersList.end()) {
        handlersList[trigger] = std::vector<State::Action>();
    } else {
        std::cout << "Trigger already exists: " << trigger << std::endl;
    }
}