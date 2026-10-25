#include "backend/inc/Actions.hpp"
#include <iostream>

SendMessage::SendMessage(AttributesData attributes, std::string messageName): attributes(attributes), messageName(messageName) {};

// MESSAGE_NAME: messageName; PARAMS_INT: 1,2,3; PARAMS_STRING: "str1","str2"; PARAMS_BOOL: true,false,true

void SendMessage::operator()(){

}

ChangeState::ChangeState(std::string& actualState, std::string newState) : actualState(&actualState), newState(newState) {};

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
template class Assign<int>;