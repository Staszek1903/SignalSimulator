#include <iostream>
#include "backend/inc/State.hpp"

std::vector<State::Action>& State::getHandlerByTrigger(const std::string& trigger){
    return handlersList[trigger];
}