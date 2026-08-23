# Beta Komando Wilkow Alfa

Projekt jest podzielony na dwie czesci:

- `frontend/` - statyczna aplikacja przegladarkowa,
- `backend/` - podstawowy projekt C++20 oparty na CMake.

## Frontend

Otworz `frontend/index.html` w przegladarce.
Przycisk **Uruchom** otwiera `ws://localhost:8080/ws` i wysyla przez WebSocket
aktualny stan obiektow i wiadomosci jako JSON. Backend co sekunde przesuwa kazdy
obiekt do kolejnego stanu i sam wysyla nowy stan przez to samo polaczenie.

## Backend

Otworz folder `backend` w Visual Studio Code. Zalecane rozszerzenia zostana
zaproponowane automatycznie. Projekt mozna zbudowac skrotem `Ctrl+Shift+B`,
a uruchomic lub debugowac z panelu **Run and Debug**.

Z terminala:

```sh
cd backend
cmake --preset debug
cmake --build --preset debug
```

Backend przyjmuje wylacznie poprawny obiekt JSON o rozmiarze do 1 MiB.
