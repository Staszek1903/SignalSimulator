#include <map>
class Element {
    public:
    void runTrigger(std::string trigger);
    void addAction(std::string trigger, std::string action);
    void addTrigger(std::string trigger, std::string startAction);
    private:
    int actualState{0};
    vector<State> statesList;
}