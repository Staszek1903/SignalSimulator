#include "backend/inc/State.hpp"
#include <functional>
#include <string>

class Element {
    public:
    void runTrigger(std::string trigger);
    void addAction(std::string trigger, std::string action);
    void addTrigger(std::string trigger, std::string startAction);
    void addState(std::string stateName, std::string firstHandler);
    void removeState(std::string stateName);
    private:
    enum class ActionType {
        INVALID,
        SEND_MESSAGE,
        ASSIGN,
        CHANGE_STATE
    };

    static ActionType actionTypeFromString(const std::string& action);
    static std::string findDataByKeyword(std::string data, std::string keyword);
    void readAttributesFromTheString(const std::string& action);
    std::string actualState;
    std::map<std::string, State> statesList;
    //std::vector<State> statesList;
};