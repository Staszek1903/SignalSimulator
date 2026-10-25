#include <map>
#include <string>

struct AttributesData{
    std::map<std::string, int> intAttributes;
    std::map<std::string, double> doubleAttributes;
    std::map<std::string, std::string> stringAttributes;
    std::map<std::string, bool> boolAttributes;

    AttributesData(std::string attributes);

    void addAttribute(std::string name, int value);
    void addAttribute(std::string name, std::string value);
    void addAttribute(std::string name, bool value);
    void addAttribute(std::string name, double value);
    void removeAttribute(std::string name);
    std::string findDataByKeyword(std::string data, std::string keyword, std::string delimeter=";");
};