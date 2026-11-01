#include "backend/inc/actions.hpp"
#include <iostream>

SendMessage::SendMessage(std::string attributesValues, std::string messageName): attributes(attributesValues, messageName), messageName(messageName) {};

void SendMessage::operator()(){
    std::string encodedMessage = Message::encodeMessage(messageName, attributes);
    std::cout << "Sending message: " << encodedMessage << std::endl;
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