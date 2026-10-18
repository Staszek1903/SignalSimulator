#include <iostream>
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

std::string Element::findDataByKeyword(std::string data, std::string keyword){

    size_t keywordBegin = data.find(keyword);

    if (keywordBegin != std::string::npos) {
        // Przesuń indeks na miejsce ZARAZ PO "Action:" (czyli dodaj długość tego słowa)
        size_t wantedDataBegin = keywordBegin + keyword.length();

        // 2. Znajdź średnik, ale szukaj go DOPIERO OD miejsca 'startTekstu'
        size_t wantedDataEnd = data.find(';', wantedDataBegin);

        if (wantedDataEnd != std::string::npos) {
            size_t length = wantedDataEnd - wantedDataBegin;

            return data.substr(wantedDataBegin, length);
        } else {
            return "Data is empty!";
        }
    }

}
//"Action:Assign;Type:Int/String/Bool;Value:4, ParameterName:Name"
//"Action:ChangeState;StateName:B"
//"Action:SendMessage;MessageName:Ssdasd;ParamsInt:2,3,4,5;ParamsString:"dwdasd","erey";ParamsBool:true,false,true,false
Element::ActionType Element::actionTypeFromString(const std::string& data){
    std::string action = findDataByKeyword(data, "Action");
    if(action == "SendMessage") return ActionType::SEND_MESSAGE;
    if(action == "Assign") return ActionType::ASSIGN;
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
        case ActionType::ASSIGN:
            handler.emplace_back(Assign{});
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