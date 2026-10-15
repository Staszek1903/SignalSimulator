#include "../inc/Element.h"

void Element::runTrigger(std::string trigger){
    int tmpState = actualState;
    auto handler = getHandlerByTrigger(trigger);
    for(const auto& atomicProcedure: handler){
        atomicProcedure->action();
        if(tmpState != actualState) {
            runTrigger("start");
            break;
        }
    }
}

void Element::addAction(std::string trigger, std::string action){
    auto handler = getHandlerByTrigger(trigger);
    std::unique_ptr<Actions> newAction = std::nullptr;
    switch(action){
        case "SendMessage":
            newAction = std::make_unique<SendMessage>(/*add params*/);
            break;
        case "Associate":
            newActon = std::make_unique<Associate>(/*add params*/);
            break;
        case "ChangeState":
            newAction = std::make_unique<ChangeState>(/*add params*/);
            break;
    }
    if(newAction){
        handler.push_back(newAction);
    } 
    else{
        std::cout<<"Niewlasciwa nazwa akcji"<<"\n";
    }
}