#include "backend/inc/State.hpp"
#include <string>

class Element {
    public:
    void runTrigger(std::string trigger);
    void addAction(std::string trigger, std::string action);
    void addTrigger(std::string trigger, std::string startAction);
    void addState(std::string stateName, std::string firstHandler);
    void removeState(std::string stateName);
    template <typename T>
    void addAttribute(std::string name, T value);
    void removeAttribute(std::string name);

    private:
    enum class ActionType {
        INVALID,
        SEND_MESSAGE,
        ASSIGN,
        CHANGE_STATE
    };
    void addAssignActionByType(std::string action, std::vector<State::Action>& handler, AttributesData& attributes);
    static ActionType actionTypeFromString(const std::string& action);
    static std::string findDataByKeyword(std::string data, std::string keyword, std::string delimeter=";");
    void readAttributesFromTheString(const std::string& action);
    AttributesData attributes;
    std::string actualState;
    std::map<std::string, State> statesList;
    //std::vector<State> statesList;
};