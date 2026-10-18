#include "backend/inc/AttributesData.hpp"
#include <map>
#include <string>

class SendMessage{
    private:
    AttributesData attributes;
    std::string messageName;
    public:
    SendMessage(AttributesData attributes, std::string messageName);
    void operator()();
};

template <typename T>
class Assign{
    private:
    T* attribute;
    T value;
    public:
    Assign(std::map<std::string, T>& attributesList, T value, std::string name);
    void operator()();
};

class ChangeState{
    private:
    std::string* actualState;
    std::string newState;
    public:
    ChangeState(std::string& actualState, std::string newState);
    void operator()();
};