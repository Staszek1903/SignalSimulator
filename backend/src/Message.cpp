#include "backend/inc/Message.hpp"

void Message::addMessage(const std::string& messageName, const Message::oneMessageAttributes& attributes) {
    messagesList[messageName] = attributes; 
}

void Message::removeMessage(const std::string& messageName) {
    messagesList.erase(messageName);
}

void Message::addAttributeToMessage(const std::string& messageName, const std::string& attributeName, AttributeType type) {
    auto it = messagesList.find(messageName);
    if (it != messagesList.end()) {
        it->second[attributeName] = type;
    }
}

Message::oneMessageAttributes Message::getMessage(const std::string& messageName) {
    auto it = messagesList.find(messageName);
    if (it != messagesList.end()) {
        return it->second;
    }
    return oneMessageAttributes(); // Return an empty map if the message doesn't exist
}

void Message::removeAttributeFromMessage(const std::string& messageName, const std::string& attributeName) {
    auto it = messagesList.find(messageName);
    if (it != messagesList.end()) {
        it->second.erase(attributeName);
    }
}