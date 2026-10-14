struct AttributesData{
    std::map<std::string name, int value> intAttributes;
    std::map<std::string name, double value> intAttributes;
    std::map<std::string name, string value> stringAttributes;
    std::map<std::string name, bool value> boolAttributes;

    AttributesData(std::string attributes);
}