#include <iostream>
#include <sstream>
#include <vector>

#include "backend/inc/message.hpp"

//"Name:aaa,Value:2,Type:int; Name:aaa,value:3;Type:int;"
//ParamsString:"dwdasd","erey".ParamsBool:0,1,0,1.\n"

AttributesData::AttributesData(std::string attributesValues, std::string messageName) {
    std::stringstream ss(attributesValues);
    std::string attributeValue;
    std::vector<std::string> listOfAttributesValues;
    auto attributesNames = Message::getMessageAttributesNames(messageName);
    while (std::getline(ss, attributeValue, ',')) {
        listOfAttributesValues.push_back(attributeValue);
    }
    for (const auto& [name, type] : attributesNames) {
        if(listOfAttributesValues.empty()) {
            std::cout << "Not enough attribute values provided for message: " << messageName << "Missing attribute for" << name<< std::endl;
            break;
        }
        if(type == Message::AttributeType::INT) {
            addAttribute(name, std::stoi(listOfAttributesValues.front()));
        } else if(type == Message::AttributeType::DOUBLE) {
            addAttribute(name, std::stod(listOfAttributesValues.front()));
        } else if(type == Message::AttributeType::STRING) {
            addAttribute(name, listOfAttributesValues.front());
        } else if(type == Message::AttributeType::BOOL) {
            addAttribute(name, listOfAttributesValues.front() == "1" || listOfAttributesValues.front() == "true");
        }
        listOfAttributesValues.erase(listOfAttributesValues.begin());
    }
}

void AttributesData::addAttribute(std::string name, int value) {
    intAttributes[name] = value;
}

void AttributesData::addAttribute(std::string name, std::string value) {
    stringAttributes[name] = value;
}

void AttributesData::addAttribute(std::string name, bool value) {
    boolAttributes[name] = value;
}

void AttributesData::addAttribute(std::string name, double value) {
    doubleAttributes[name] = value;
}

void AttributesData::removeAttribute(std::string name) {
    if (intAttributes.erase(name) == 0 &&
        doubleAttributes.erase(name) == 0 &&
        stringAttributes.erase(name) == 0 &&
        boolAttributes.erase(name) == 0) {
        std::cout << "Attribute not found: " << name << std::endl;
    }
}

