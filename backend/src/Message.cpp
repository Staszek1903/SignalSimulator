#include "backend/inc/message.hpp"
#include <iostream>

std::map<std::string, Message::oneMessageAttributes> Message::messagesList;

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

Message::oneMessageAttributes Message::getMessageAttributesNames(const std::string& messageName) {
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

std::string Message::encodeMessage(const std::string& messageName, AttributesData attributes) {
    auto attributesNames = getMessageAttributesNames(messageName);
    std::string encodedMessage = "MessageName:" + messageName;
    for (const auto& [name, type] : attributesNames) {
        switch (type) {
            case AttributeType::INT:
                if (attributes.intAttributes.find(name) == attributes.intAttributes.end()) {
                    std::cout << "Missing INT attribute: " << name << " for message: " << messageName << std::endl;
                } else{
                    encodedMessage += ";" + name + ":" + std::to_string(attributes.intAttributes.at(name));
                }
                break;
            case AttributeType::DOUBLE:
                if (attributes.doubleAttributes.find(name) == attributes.doubleAttributes.end()) {
                    std::cout << "Missing DOUBLE attribute: " << name << " for message: " << messageName << std::endl;
                } else{
                    encodedMessage += ";" + name + ":" + std::to_string(attributes.doubleAttributes.at(name));
                }
                break;
            case AttributeType::STRING:
                if (attributes.stringAttributes.find(name) == attributes.stringAttributes.end()) {
                    std::cout << "Missing STRING attribute: " << name << " for message: " << messageName << std::endl;
                } else{
                    encodedMessage += ";" + name + ":" + attributes.stringAttributes.at(name);
                }
                break;
            case AttributeType::BOOL:
                if (attributes.boolAttributes.find(name) == attributes.boolAttributes.end()) {
                    std::cout << "Missing BOOL attribute: " << name << " for message: " << messageName << std::endl;
                } else{
                    encodedMessage += ";" + name + ":" + (attributes.boolAttributes.at(name) ? "true" : "false");
                }
                break;
        }
    }
    return encodedMessage;
}