#include <map>
#include <string>

struct AttributesData{
    std::map<std::string, int> intAttributes;
    std::map<std::string, double> doubleAttributes;
    std::map<std::string, std::string> stringAttributes;
    std::map<std::string, bool> boolAttributes;

    AttributesData(std::string attributes);
};