class MaterialCatalogoCredicel {
    constructor(opt = {}){
        this.data = opt.data ?? [];
        this.count = opt.count ?? localStorage.getItem(window.location.pathname + "/TableShow") ?? 10;
        this.countToDisplay = opt.countToDisplay ?? [10, 20, 50, 100, 200, 500]
        this.page = opt.page ?? localStorage.getItem(window.location.pathname + "/TablePage") ?? 1;
        this.url = opt.url ?? null;
        this.filter = opt.filter ?? localStorage.getItem(window.location.pathname + "/TableFilter") ?? "";
        this.filterFix = opt.filterFix ?? "";
        this.filterElement = opt.filterElement ?? null;
        this.elements = opt.elements ?? [];
        this.sort = opt.sort ?? [1,0];
        this.element = opt.element ?? null;
        this.bind = opt.bind ?? null;
        this.classes = opt.classes ?? null;
        this.selectCount = opt.selectCount ?? true;
        this.pagination = opt.pagination ?? true;
        this.pagCount = opt.pagCount ?? 9;
        this.method = opt.method ?? "POST";
        this.noDataMessage = opt.noDataMessage ?? "Ningún elemento que mostrar";
        this.timeout = null;
        this.extra = opt.extra ?? {};
        this.sortEnabled = opt.sortEnabled ?? false;
        this.selectColumn = opt.selectColumn ?? false;
        this.selectedIds = [];
        this.bannedKeysFromSearch = [18, 16, 9, 17, 13, 91, 37, 38, 39, 40];
        this.fetching = false;

        if(opt.afterGetData !== undefined){
            this.afterGetData = opt.afterGetData;
        }else {
            this.afterGetData = ()=>{return true};
        }

        if(opt.preGetData !== undefined){
            this.preGetData = opt.preGetData;
        }else {
            this.preGetData = ()=>{};
        }

        if(opt.afterRender !== undefined){
            this.afterRender = opt.afterRender;
        }else {
            this.afterRender = (a)=>{};
        }

        if (opt.rowHandler !== undefined){
            this.rowHandler = opt.rowHandler;
        }else {
            this.rowHandler = (row, data) => { return row; }
        }

        if (opt.cell !== undefined){
            this.cell = opt.cell;
        }else {
            this.cell = (cell, data, col) => {
                return cell;
            }
        }

        if (this.filterElement !== null){
            this.filterElement.value = this.filter;
            this.filterElement.addEventListener("submit", (e)=>{
                if (this.fetching){
                    return false;
                }
                this.page = 1;
                this.filter = this.filterElement.querySelector("#inputSearch").value;
                localStorage.setItem(window.location.pathname + "/TableFilter", this.filter);
                this.getData();
                e.preventDefault();
            })
            this.filterElement.querySelector("#inputSearch").addEventListener("focusout", () => {
                if (this.filterElement.querySelector("#inputSearch").value == "" && this.filter != "") this.filterElement.querySelector("#inputSearch").value = this.filter
            });
            if (this.filter != ''){
                if (this.filterElement.querySelector("#inputSearch").value == "" && this.filter != "") this.filterElement.querySelector("#inputSearch").value = this.filter
            }
            this.filterElement.querySelector("#inputSearch").addEventListener("input", e=>{
                if (this.filterElement.querySelector("#inputSearch").value === ""){
                    this.filterElement.querySelector("#inputSearch").value = "";
                    localStorage.setItem(window.location.pathname + "/TableFilter", "");
                    this.filter = "";
                    this.getData();
                }
            })
        }
        this.a =  this.getCheckbox("", "todos");
        this.headers = opt.headers ?? true;
        this.footer = opt.footer ?? true;
        this.selectedAll = false;

        this.fetchController = new AbortController();
        this.fetchSignal = this.fetchController.signal;

        this.getData();
    }

    getCheckbox(nombre, id){
        if (this.element == null) return;
        let checked = "";
        let idx = this.selectedIds?.indexOf(id);
        checked = idx == -1 ? "" : "checked";
        if (id == "todos" && this.selectedAll){
            checked = "checked";
        }
        return `
            <p style="margin:0!important">
                <label>
                    <input type="checkbox" id="cb_${this.element.getAttribute("id")}_${id}" ${checked}  />
                    <span>${nombre}</span>
                </label>
            </p>
        `;
    }

    getData(showLoader=true){
        if (this.selectColumn) {
            if (this.elements[0] != this.a){
                this.elements.unshift(this.a);
            }
        }else {
            if (this.elements[0] == this.a){
                this.elements.shift();
            }
        }

        let before = this.element?.style.position;
        if (typeof loader === "function" && showLoader){
            if (this.element !== null) {
                this.element.style.position = "relative";
            }
            loader("Cargando datos", this.element);
        }
        this.preGetData(this);
        if (this.url){
            this.fetching = true;
            fetch(this.url, {
                method: this.method,
                body: JSON.stringify({
                    count: this.count,
                    page: this.page,
                    filter: this.filter + " " + this.filterFix,
                    sort: this.sort,
                    extra: this.extra
                }),
                signal: this.fetchSignal
            }).then(response => {
                if (response.ok){
                    return response.json();
                }else {
                    console.error(response.status);
                }
            }).then(data => {
                if (this.elements.length == 0){
                    this.elements = data.elements;
                }
                this.total = data.total;
                if (this.total == "?"){
                    this.fetchTotal();
                }
                this.data = data.data;
                if (typeof loader === "function" && showLoader){
                    if (this.element !== null) this.element.style.position = before;
                    loader();
                }
                if (this.afterGetData(this)) this.render();
                this.fetching = false;
            })
        }else if (this.data.length == 0){
            console.warn("La tabla no tiene una URL ni datos asociados. Nada que imprimir");
            return;
        }else {
            this.render();
        }
    }
    async fetchTotal(){
        let f = await fetch(this.url, {
            method: this.method,
            body: JSON.stringify({
                count: this.count,
                page: this.page,
                filter: this.filter + " " + this.filterFix,
                sort: this.sort,
                extra: this.extra,
                getTotalAsync: "1",
            }),
            signal: this.fetchSignal
        });
        let r = await f.json();
        if ("total" in r){
            this.total = r.total;
            this.render();
        }
    }
    render(){
        if(this.selectColumn){
            this.a = this.getCheckbox("", "todos");
            this.elements[0] = this.a;
        }
        if (this.element === null){
            console.error("No hay un elemento asociado al catálogo");
            return;
        }
        let container = document.createElement("div");
        // table.classList.add("MaterialTableAXS"); Aqui añadimos estilos para el catálogo
        if (this.classes !== null){
            container.classList.add(...this.classes);
        }

        this.element.innerHTML = "";
        this.element.appendChild(container);
        this.filterElement?.focus();
        //Aqui van todos los registros del api
        if (this.data.length > 0) {
            for (let row of this.data) {
                //Se crea el contenedor para la ficha
                let ficha = document.createElement('div');
                ficha.classList.add('card');
                ficha.classList.add('ficha-container-q');
                let body = document.createElement('div');
                body.classList.add('card-body');
                let actions = null;
                for (let col of this.elements) {
                    let elemento = null;
                    let keyElement = col.split('.');
                    if (keyElement[0] === 'img') {
                        elemento = document.createElement('img');
                        elemento.classList.add('card-img-top');
                        elemento.src = "https://www.credicel.mx/tiendas/models/getImageCotizador.php?v=780344a743beb0a0804e1f93d87d40cd";
                        ficha.appendChild(elemento);
                    } else if (keyElement[1] === 'actions') {
                        let actionsElement = document.createElement(keyElement[0]);
                        actionsElement.setAttribute('class', keyElement[2]);
                        let nameElement = this.bind[keyElement[1]] ?? keyElement[1];
                        actionsElement.innerHTML = this.cell(row[keyElement[1]], row, keyElement[1]);
                        actions = actionsElement;
                    } else {
                        let textElement = document.createElement(keyElement[0]);
                        textElement.setAttribute('class', keyElement[2]);
                        let nameElement = this.bind[keyElement[1]] ?? keyElement[1];
                        textElement.innerHTML = nameElement + ' ' + this.cell(row[keyElement[1]], row, keyElement[1]);
                        body.appendChild(textElement);
                    }
                }
                ficha.appendChild(body);
                ficha.appendChild(actions);
                container.appendChild(ficha);
            }
        }
        // }else {
        //     tr = this.rowHandler(document.createElement("tr"), {});
        //     let td = document.createElement("td");
        //     td.innerHTML = this.noDataMessage;
        //     td.setAttribute("colspan", this.elements.length)
        //     tr.appendChild(td);
        //     tbody.appendChild(tr);
        // }

        if ((this.pagination || this.selectCount) && this.data.length > 0){
            let ulContainer = document.createElement('ul');
            ulContainer.setAttribute('class', 'pagination justify-content-center');
            let colCount = this.elements.length;
            let select;

            // if (this.selectCount){
            //     let selecttd = document.createElement("td");
            //     selecttd.setAttribute("colspan", this.elements.length > 4 ? 2 : 1);
            //     select = document.createElement("select");
            //     select.setAttribute("id", "selectionCount")
            //     for (const option of this.countToDisplay) {
            //         let opt = document.createElement("option")
            //         opt.text = option;
            //         opt.value = option;
            //         if (option == this.count) {
            //             opt.selected = true;
            //         }
            //         select.appendChild(opt);
            //     }
            //     selecttd.appendChild(select);
            //     tr.appendChild(selecttd);
            //
            //     let total = document.createElement("td")
            //     total.innerHTML = `de  <span id="materialTableAXS">${this.total == "?" ? "muchas" : this.total}</span>`;
            //     total.classList.add("grey-text")
            //     tr.appendChild(total);
            // }

            if (this.pagination){
                let paginationtd = document.createElement("nav");
                paginationtd.setAttribute("colspan", colCount - (this.selectCount ? 3 : 0));

                let pages = Math.ceil(this.total/this.count);
                let min, max;

                if (pages <= this.pagCount){
                    min = 1;
                    max = pages;
                }else {
                    min = this.page - Math.floor(this.pagCount/2);
                    max = this.page + Math.ceil(this.pagCount/2);

                    if (min <= 0){
                        min = 1;
                        max = this.pagCount;
                    }

                    if (max >= pages + 1) {
                        max = pages;
                        min = pages - this.pagCount;
                    }
                }

                //<i className="material-icons">first_page</i> icono en text
                // let first = this.createLi(this.page == min ? "disabled" : "", 'Anterior');
                // ulContainer.appendChild(first);
                // if(this.page != min){
                //     first.addEventListener("click", (e)=>{
                //         this.page = 1
                //         localStorage.setItem(window.location.pathname + "/TablePage", this.page)
                //         this.getData();
                //     })
                // }

                //<i className="material-icons">chevron_left</i>
                let prev = this.createLi(this.page == min ? "disabled" : "", 'Anterior');
                ulContainer.appendChild(prev);
                if(this.page != min){
                    prev.addEventListener("click", (e)=>{
                        if (this.page == 1) return;
                        this.page = this.page - 1
                        localStorage.setItem(window.location.pathname + "/TablePage", this.page);
                        this.getData();
                    })
                }

                for (let i = min; i <= max; i++) {
                    let li = this.createLi(i == this.page ? "active" : "waves-effect", i);
                    li.addEventListener("click", (e) => {
                        if (i == this.page) return;
                        this.page = i;
                        localStorage.setItem(window.location.pathname + "/TablePage", this.page);
                        this.getData();
                    })
                    ulContainer.appendChild(li);
                }

                let next = this.createLi(this.page == max ? "disabled" : "", 'Siguiente');
                ulContainer.appendChild(next);
                if (this.page != max){
                    next.addEventListener("click", (e)=>{
                        if (this.page == 1) return;
                        this.page = this.page + 1
                        localStorage.setItem(window.location.pathname + "/TablePage", this.page);
                        this.getData();
                    })
                }


                // let last = this.createLi(this.page == max ? "disabled" : "", '<i class="material-icons">last_page</i>');
                // ulContainer.appendChild(last);
                // if (this.page != max){
                //     last.addEventListener("click", (e)=>{
                //         this.page = pages
                //         localStorage.setItem(window.location.pathname + "/TablePage", this.page);
                //         this.getData();
                //     })
                // }


                paginationtd.appendChild(ulContainer);
                this.element.appendChild(paginationtd);
            }

            // select.addEventListener("change", (e) => {
            //     this.count = Number(e.target.value);
            //     localStorage.setItem(window.location.pathname + "/TableShow", this.count);
            //     this.getData();
            // })
        }

        if (this.sortEnabled){
            this.element.querySelectorAll("th").forEach((e, i, array) => {
                e.addEventListener("click", (ev) => {
                    ev.preventDefault();
                    this.sort[1] = this.elements[i] != this.sort[0] ? 1 : (this.sort[1] + 1)%2
                    this.sort[0] = this.elements[i];
                    this.getData();
                    let a = this.sort[1] == 0 ? "arrow_circle_down" : "arrow_circle_up";

                })
            })
        }

        if (this.selectColumn){
            this.element.querySelectorAll("input[type=checkbox]").forEach( (e, i) => {
                e.addEventListener("change", (ev) => {
                    let id = ev.target.getAttribute("id").split("_");
                    id = id[id.length - 1];
                    this.addRemoveIdFromSelected(id, ev.target.checked);
                })
            })
        }

        this.afterRender(this);
    }

    getIds(estatus){
        loader("Obteniendo datos");
        if (this.url){
            fetch(this.url, {
                method: this.method,
                body: JSON.stringify({
                    count: Number.MAX_SAFE_INTEGER,
                    page: 1,
                    filter: this.filter + " " + this.filterFix,
                    sort: this.sort,
                    extra: this.extra
                })
            }).then(response => {
                if (response.ok){
                    return response.json();
                }else {
                    console.error(response.status);
                }
            }).then(data => {
                this.selectedIds = data.data;
                loader();
                this.render();
            })
        }else if (this.data.length == 0){
            console.warn("La tabla no tiene una URL ni datos asociados. Nada que imprimir");
            return;
        }else {
            this.render();
        }
    }
    addRemoveIdFromSelected(id, estatus){
        if (id == "todos") {
            this.selectedAll = estatus;
            if (estatus){
                this.extra.selectJustId = true;
                this.getIds(estatus);
                delete this.extra.selectJustId;
            }else {
                this.selectedIds = [];
                this.render();
            }
        }else {
            id = Number(id);
            if (estatus){
                if (this.selectedIds.indexOf(id) != -1) return;
                this.selectedIds.push(Number(id));
            }else {
                let index = this.selectedIds.indexOf(id);
                if (index  == -1) return;
                this.selectedIds.splice(index, 1);
            }
        }
    }

    setSelectComlumn(a=false){
        this.selectColumn = a == true;
        this.getData();
    }

    createLi(clase="", text=""){
        let li = document.createElement("li");
        li.classList.add('page-item');
        let a = document.createElement("a");
        a.classList.add('page-link');
        a.innerHTML = text;
        li.appendChild(a);
        if (clase !== ""){
            li.classList.add(clase)
        }
        return li;
    }
}
