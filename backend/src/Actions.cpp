#include "backend/inc/Actions.hpp"
#include <iostream>

SendMessage::SendMessage(AttributesData attributes, std::string messageName){
    
}

void SendMessage::operator()(){

}

ChangeState::ChangeState(int& actualState, int newState) : actualState(&actualState), newState(newState) {};

void ChangeState::operator()(){
    *actualState = newState;
}

template <typename T>
Assign<T>::Assign(std::map<std::string, T>& attributesList, T value, std::string name) {
    auto it = attributesList.find(name);
    
    if (it != attributesList.end()) {
        std::cout << "Find attribute! name:" << it->first << ".\n";
        this->attribute = &(it->second);
        this->value = value;
    } else {
        std::cout << "attribute not exist: " << name << "\n";
    }
}

template <typename T>
void Assign<T>::operator()(){
    if(attribute) {
        *attribute = value;
    }
}

template class Assign<double>;
template class Assign<std::string>;
template class Assign<bool>;