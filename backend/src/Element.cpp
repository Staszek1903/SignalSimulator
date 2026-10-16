#include <iostream>
#include "backend/inc/Actions.hpp"
#include "backend/inc/Element.hpp"

void Element::runTrigger(std::string trigger){
    int tmpState = actualState;
    auto& handler = statesList.at(actualState).getHandlerByTrigger(trigger);
    for(const auto& atomicProcedure: handler){
        atomicProcedure();
        if(tmpState != actualState) {
            runTrigger("start");
            break;
        }
    }
}

Element::ActionType Element::actionTypeFromString(const std::string& action){
    if(action == "SendMessage") return ActionType::SEND_MESSAGE;
    if(action == "Associate") return ActionType::ASSOCIATE;
    if(action == "ChangeState") return ActionType::CHANGE_STATE;
    return ActionType::INVALID;
}

void Element::addAction(std::string trigger, std::string action){
    ActionType actionType = actionTypeFromString(action);
    auto& handler = statesList.at(actualState).getHandlerByTrigger(trigger);
    switch(actionType){
        case ActionType::SEND_MESSAGE:
            handler.emplace_back(SendMessage{});
            break;
        case ActionType::ASSOCIATE:
            handler.emplace_back(Assign{});
            break;
        case ActionType::CHANGE_STATE:
            handler.emplace_back(ChangeState{});
            break;
        default:
            std::cout << "Wrong action type" << "\n";
            return;
    }
}