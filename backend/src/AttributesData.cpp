#include <iostream>
#include <sstream>

#include "backend/inc/AttributesData.hpp"

//"Name:aaa,Value:2,Type:int; Name:aaa,value:3;Type:int;"
//ParamsString:"dwdasd","erey".ParamsBool:0,1,0,1.\n"

AttributesData::AttributesData(std::string attributes) {

    std::string oneTypeParams = findDataByKeyword(attributes, "ParamsInt:", ".");
    std::stringstream ss(oneTypeParams);
    std::string attribute;
    while (std::getline(ss, attribute, ';')) {
        std::string name = findDataByKeyword(attribute, "Name:", ",");
        std::string value = findDataByKeyword(attribute, "Value:", ",");
        addAttribute(name, std::stoi(value));
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

