const { app, BrowserWindow, ipcMain, Tray, nativeImage, Menu,  } = require("electron");
const path = require("node:path");
const sqlite3 = require("sqlite3").verbose();

if (require("electron-squirrel-startup")) {
    app.quit();
}

// Database
const dbPath = path.join(app.getPath("userData"), "todo.db");
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("DB Connection failed:", err.message);
        app.quit();
    }
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            marked INTEGER DEFAULT 0
        )
    `, (err) => {
        if (err) console.error("Table creation failed:", err.message);
    })
})

let mainWindow
let tray

function CreateWindow() {
    if (mainWindow) return;

    mainWindow = new BrowserWindow({
        width: 465,
        height: 565, // 580
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    mainWindow.loadFile(path.join(__dirname, "index.html"));

    mainWindow.on("closed", () => {
        mainWindow = null;
    })
}

function RegisterIPC() {
    ipcMain.handle("getTodos", async () => {
        return new Promise((resolve, reject) => {
            db.all("SELECT * FROM todos ORDER BY id ASC", (err, rows) => {
                if (err) return reject(err);

                resolve(rows.map(t => ({
                        id: t.id,
                        title: t.title,
                        message: t.message,
                        marked: t.marked === 1
                })));
            });
        });
    });

    ipcMain.handle("addTodo", async (event, todo) => {
        return new Promise((resolve, reject) => {
            db.run(
                "INSERT INTO todos (title, message, marked) VALUES (?, ?, ?)",
                [todo.title, todo.message, todo.marked ? 1 : 0],
                function (err) {
                    if (err) return reject(err);

                    resolve(this.lastID);
                }
            );
        });
    });

    ipcMain.on("updateTodo", (_, todo) => {
        if (!todo?.id) return;

        db.run(
            "UPDATE todos SET title = ?, message = ?, marked = ? WHERE id = ?",
            [todo.title, todo.message, todo.marked ? 1 : 0, todo.id],
            (err) => {
                if (err) console.error("Update failed:", err.message);
            }
        );
    });

    ipcMain.on("deleteTodo", (_, id) => {
        if (!id) return;

        db.run("DELETE FROM todos WHERE id = ?", [id], (err) => {
            if (err) console.error("Delete failed:", err.message);
        });
    });

    ipcMain.on("removeAllTodo", () => {
        db.run("DELETE FROM todos", function (err) {
            if (err) console.error("RemoveAll failed:", err.message);
        });
    })
}

app.whenReady().then(() => {
    RegisterIPC();
    CreateWindow();

    const iconPath = path.join(__dirname, "image", "logo.png");
    tray = new Tray(nativeImage.createFromPath(iconPath));
    tray.setTitle("To Do List")

    app.on("activate", () => {
        if (!mainWindow) CreateWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        db.close();
        app.quit();
    }
});