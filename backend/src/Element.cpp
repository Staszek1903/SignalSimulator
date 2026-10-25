#include <iostream>
#include <sstream>
#include "backend/inc/Actions.hpp"
#include "backend/inc/Element.hpp"

void Element::runTrigger(std::string trigger){
    try {
        auto& handler = statesList.at(actualState).getHandlerByTrigger(trigger);
        std::string tmpState = statesList.at(actualState).getName();
        for(const auto& atomicProcedure: handler){
            atomicProcedure();
            if(tmpState != actualState) {
                runTrigger("start");
                break;
        }
    }
    } catch (const std::out_of_range& e) {
        std::cout << "Error: Couldn't find specific state!" << std::endl;
    }
}

std::string Element::findDataByKeyword(std::string data, std::string keyword, std::string delimeter){

    size_t keywordBegin = data.find(keyword);

    if (keywordBegin != std::string::npos) {
        // Przesuń indeks na miejsce ZARAZ PO "Action:" (czyli dodaj długość tego słowa)
        size_t wantedDataBegin = keywordBegin + keyword.length();

        // 2. Znajdź średnik, ale szukaj go DOPIERO OD miejsca 'startTekstu'
        size_t wantedDataEnd = data.find(delimeter, wantedDataBegin);

        if (wantedDataEnd != std::string::npos) {
            size_t length = wantedDataEnd - wantedDataBegin;

            return data.substr(wantedDataBegin, length);
        } else {
            return "Data is empty!";
        }
    }

}
//"Action:Assign;Type:Int/String/Bool;Value:4, ParameterName:Name\n"
//"Action:ChangeState;StateName:B\n"
//"Action:SendMessage;MessageName:Ssdasd;Parameters;ParamsInt:2,3,4,5.ParamsString:"dwdasd","erey".ParamsBool:0,1,0,1.\n"

//
Element::ActionType Element::actionTypeFromString(const std::string& data){
    std::string action = findDataByKeyword(data, "Action");
    if(action == "SendMessage") return ActionType::SEND_MESSAGE;
    if(action == "Assign") return ActionType::ASSIGN;
    if(action == "ChangeState") return ActionType::CHANGE_STATE;
    return ActionType::INVALID;
}

void Element::addAssignActionByType(std::string action, std::vector<State::Action>& handler, AttributesData& attributes){
    std::string type = findDataByKeyword(action, "Type");
    std::string value = findDataByKeyword(action, "Value");
    std::string parameterName = findDataByKeyword(action, "ParameterName");

    if(type == "Int") {
        handler.push_back(Assign<int>{attributes.intAttributes, std::stoi(value), parameterName});
    } else if(type == "String") {
        handler.push_back(Assign<std::string>{attributes.stringAttributes, value, parameterName});
    } else if(type == "Bool") {
        handler.push_back(Assign<bool>{attributes.boolAttributes, std::stoi(value), parameterName});
    } else if(type == "Double") {
        handler.push_back(Assign<double>{attributes.doubleAttributes, std::stod(value), parameterName});
    } 
    else {
        std::cout << "Invalid type for Assign action" << std::endl;
    }
}

void Element::addAction(std::string trigger, std::string action){
    ActionType actionType = actionTypeFromString(action);
    auto& handler = statesList.at(actualState).getHandlerByTrigger(trigger);

    switch(actionType){
        case ActionType::SEND_MESSAGE: {
            AttributesData attributes(findDataByKeyword(action, "Parameters:"));        
            handler.emplace_back(SendMessage{attributes, findDataByKeyword(action, "MessageName:")});
            break;
        }
        case ActionType::ASSIGN:
            addAssignActionByType(action, handler, attributes);
            break;
        case ActionType::CHANGE_STATE: {
            std::string newState = findDataByKeyword(action, "StateName:");
            handler.emplace_back(ChangeState{actualState, newState});
            break;
        }
        default:
            std::cout << "Wrong action type" << "\n";
            return;
    }
}

void Element::addTrigger(std::string trigger, std::string startAction){
    statesList.at(actualState).addEmptyTrigger(trigger);
    addAction(trigger, startAction);
}

void Element::addState(std::string stateName, std::string firstHandler){
    State newState;
    newState.addEmptyTrigger("start");
    statesList.insert({stateName, newState});
    std::stringstream ss(firstHandler);
    std::string action;
    while (std::getline(ss, action, '\n')){
        addAction("start", action);
    }
}

void Element::removeState(std::string stateName){
    statesList.erase(stateName);
    if (actualState == stateName) {
        std::cout << "Warning: Removed the current state. Switching to the first available state." << std::endl;
        if (!statesList.empty()) {
            actualState = statesList.begin()->first; // Set to the first available state
        }
        else {
            std::cout << "No states available after removal." << std::endl;
            actualState.clear(); // Clear the actual state if no states are left
        }
    }
}

template <typename T>
void Element::addAttribute(std::string name, T value){
    attributes.addAttribute(name, value);
}

void Element::removeAttribute(std::string name){
    attributes.removeAttribute(name);
}