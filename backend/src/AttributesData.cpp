#include <iostream>
#include <sstream>

#include "backend/inc/AttributesData.hpp"
#include "backend/inc/Message.hpp"

//"Name:aaa,Value:2,Type:int; Name:aaa,value:3;Type:int;"
//ParamsString:"dwdasd","erey".ParamsBool:0,1,0,1.\n"

AttributesData::AttributesData(std::string attributesValues, std::string messageName) {
    std::stringstream ss(attributesValues);
    std::string attributeValue;
    std::vector<std::string> listOfAttributesValues;
    auto attributesNames = Message::getMessage(messageName);
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

std::string AttributesData::findDataByKeyword(std::string data, std::string keyword, std::string delimeter){

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

