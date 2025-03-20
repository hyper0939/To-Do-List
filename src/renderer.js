const { ipcRenderer } = require("electron");

document.addEventListener("DOMContentLoaded", loadTodos);

async function loadTodos() {
    const listContainer = document.querySelector(".ListBG");
    listContainer.innerHTML = "";

    const todos = await ipcRenderer.invoke("getTodos");
    todos.forEach(todo => {
        addTaskToUI(todo.id, todo.title, todo.message, todo.marked);
    });
}

function addTaskToUI(id, titleText, messageText, marked) {
    const listContainer = document.querySelector(".ListBG");
    const newTask = document.createElement("div");
    newTask.classList.add("ListBg");
    newTask.style.animation = "Up 1s ease-out";

    newTask.innerHTML = `
        <button class="Remove">X</button>
        <input placeholder="Title..." class="TitleInput" value="${titleText}">
        <input placeholder="Message..." class="MessageInput" value="${messageText}">
        <label class="neon-checkbox">
            <input type="checkbox" class="TaskCheckbox" ${marked ? "checked" : ""}/>
            <div class="neon-checkbox__frame">
                <div class="neon-checkbox__box">
                    <div class="neon-checkbox__check-container">
                        <svg viewBox="0 0 24 24" class="neon-checkbox__check">
                            <path d="M3,12.5l7,7L21,5"></path>
                        </svg>
                    </div>
                    <div class="neon-checkbox__glow"></div>
                    <div class="neon-checkbox__borders">
                        <span></span><span></span><span></span><span></span>
                    </div>
                </div>
                <div class="neon-checkbox__effects">
                    <div class="neon-checkbox__particles">
                        <span></span><span></span><span></span><span></span> 
                        <span></span><span></span><span></span><span></span> 
                        <span></span><span></span><span></span><span></span>
                    </div>
                    <div class="neon-checkbox__rings">
                        <div class="ring"></div>
                        <div class="ring"></div>
                        <div class="ring"></div>
                    </div>
                    <div class="neon-checkbox__sparks">
                        <span></span><span></span><span></span><span></span>
                    </div>
                </div>
            </div>
        </label>
    `;

    listContainer.appendChild(newTask);

    newTask.querySelector(".TitleInput").addEventListener("input", (e) => {
        ipcRenderer.send("updateTodo", { id, title: e.target.value, message: messageText, marked });
    });

    newTask.querySelector(".MessageInput").addEventListener("input", (e) => {
        ipcRenderer.send("updateTodo", { id, title: titleText, message: e.target.value, marked });
    });

    newTask.querySelector(".TaskCheckbox").addEventListener("change", (e) => {
        const isChecked = e.target.checked;
        ipcRenderer.send("updateTodo", { id, title: titleText, message: messageText, marked: isChecked });
    });

    newTask.querySelector(".Remove").addEventListener("click", () => {
        newTask.style.animation = "Down 1s";
        setTimeout(() => {
            newTask.remove();
            ipcRenderer.send("deleteTodo", id);
        }, 1000);
    });
}

document.querySelector(".Create").addEventListener("click", () => {
    const title = "Neue Notiz";
    const message = "Beschreibung eingeben...";
    
    ipcRenderer.invoke("addTodo", { title, message, marked: false }).then(id => {
        addTaskToUI(id, title, message, false);
    });
});