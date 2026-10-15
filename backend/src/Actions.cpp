#include "../inc/Actions.h"
#include <iostream>

SendMessage::SendMessage(AttributesData attributes, std::string messageName){
    
}

SendMessage::action(){

}

ChangeState::ChangeState(int& actualState, int newState) : actualState(actualState), newState(newState) {};

ChangeState::action(){
    actualState = newState;
}

template <typename T>
Assign<T>::Assign(std::map<T>& attributesList, T value, string name) {
    auto it = attributesList.find(name);
    
    if (it != attributesList.end()) {
        std::cout << "Find attribute! name:" << it->first << ".\n";
        this->attribute = &(it->second);
        this.value = value;
    } else {
        std::cout << "attribute not exist: " << name << "\n";
    }
}

template <typename T>
Assign<T>::action(){
    if(attribute) {
        *attribute = value;
    }
}

template class Assign<double>;
template class Assign<std::string>;
template class Assign<bool>;