const { app, BrowserWindow, ipcMain, Tray } = require("electron");
const path = require("node:path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = path.join(app.getPath("userData"), "todo.db");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(
        "CREATE TABLE IF NOT EXISTS todos (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, message TEXT, marked INTEGER DEFAULT 0)",
        (err) => {
            if (err) console.error("Fehler beim Erstellen der Tabelle:", err.message);
            else console.log("Tabelle 'todos' erfolgreich sichergestellt!");
        }
    );
});

if (require("electron-squirrel-startup")) {
    app.quit();
}

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 480,
        height: 580,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    mainWindow.loadFile(path.join(__dirname, "index.html"));

    ipcMain.handle("getTodos", async () => {
        return new Promise((resolve, reject) => {
            db.all("SELECT * FROM todos", (err, rows) => {
                if (err) {
                    console.error("Fehler beim Abrufen der Todos:", err.message);
                    reject(err);
                } else {
                    resolve(rows.map(todo => ({
                        id: todo.id,
                        title: todo.title,
                        message: todo.message,
                        marked: todo.marked === 1
                    })));
                }
            });
        });
    });

    ipcMain.handle("addTodo", async (event, todo) => {
        return new Promise((resolve, reject) => {
            db.run(
                "INSERT INTO todos (title, message, marked) VALUES (?, ?, ?)",
                [todo.title, todo.message, todo.marked ? 1 : 0],
                function (err) {
                    if (err) {
                        console.error("Fehler beim Hinzufügen eines Todos:", err.message);
                        reject(err);
                    } else {
                        resolve(this.lastID);
                    }
                }
            );
        });
    });

    ipcMain.on("updateTodo", (event, todo) => {
        db.run(
            "UPDATE todos SET title = ?, message = ?, marked = ? WHERE id = ?",
            [todo.title, todo.message, todo.marked ? 1 : 0, todo.id],
            function (err) {
                if (err) console.error("Fehler beim Aktualisieren:", err.message);
            }
        );
    });

    ipcMain.on("deleteTodo", (event, id) => {
        db.run("DELETE FROM todos WHERE id = ?", [id], function (err) {
            if (err) console.error("Fehler beim Löschen:", err.message);
        });
    });
};

app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});