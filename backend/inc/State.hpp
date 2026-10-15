#include "../inc/Actions.h"

class State{
    public:
    std::vector<Actions> getHandlerByTrigger(std::string trigger);
    private:
    std::map<std::string, std::vector<Actions>> handlersList;
}