#include "AttributesData.h"

class Actions{
    virtual void action()() const = 0;
}

class SendMessage : public Actions{
    AttributesData attributes;
    std::string messageName;
    SendMessage(AttributesData attributes, std::string messageName);
    void action()();
}

template <typename T>
class Assign : public Actions{
    T* attribute;
    T value;
    Assign(std::map<T>& attributesList, T value, string name);
    void action()();
}

class ChangeState : public Actions{
    int* actualState;
    int newState;
    ChangeState(int& actualState, int newState);
    void action()();
}

//Przypisz wartość do atrybutu (Template), trzymajmy se refke.
//wyślij message -> struktura z wektorami każdego typu, albo będzie wpisane albo nie, w konstruktorze budujemy strukturę. Stworzyć strukturę message z obiektami i nazwą wiadomości. Dodatkowo zbudować message globalnie bo one nie są per element.
//zmień stan, stan działa jak przerwanie dla handlera, w change state zmieniamy tylko wartość actual state