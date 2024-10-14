import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import type { FC } from 'hono/jsx';

const app = new Hono();

const Layout: FC = (props) => (
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>{props.title}</title>
      <meta name="description" content={props.description} />
      <script
        src="https://unpkg.com/htmx.org@2.0.3"
        integrity="sha384-0895/pl2MU10Hqc6jd4RvrthNlDiE9U1tWmX7WRESftEDRosgxNsQG/Ze9YMRzHq"
        crossorigin="anonymous"
      />
      <link
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
        rel="stylesheet"
        integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH"
        crossorigin="anonymous"
      />
      <script
        src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
        integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz"
        crossorigin="anonymous"
      ></script>
    </head>
    <body>
      <main class="container mt-3">{props.children}</main>
    </body>
  </html>
);

app.get('/date', (c) => {
  return c.html(<strong>{Date.now()}</strong>);
});

app.get('/bold', (c) => {
  return c.html(<strong>{c.req.query('text') || 'Empty!'}</strong>);
});

app.post('/list-items', async (c) => {
  const body = await c.req.parseBody();
  return c.html(<li>{body.name}</li>);
});

app.get('/', (c) => {
  return c.redirect('/examples');
});

// index
app.get('/examples', (c) => {
  return c.html(
    <Layout>
      <ul>
        {['get', 'target', 'trigger', 'swap', 'select'].map((e) => (
          <li>
            <a href={`/examples/${e}`}>{e}</a>
          </li>
        ))}
        <li>
          <a href="/todos">todos</a>
        </li>
      </ul>
    </Layout>,
  );
});

// hx-get
app.get('/examples/get', (c) => {
  return c.html(
    <Layout>
      <button type="button" hx-get="/date">
        Load Content
      </button>
    </Layout>,
  );
});

// hx-target
app.get('/examples/target', (c) => {
  return c.html(
    <Layout>
      <div id="content-container">No content yet.</div>

      <button type="button" hx-get="/date" hx-target="#content-container">
        Load Content
      </button>
    </Layout>,
  );
});

// Different trigger and delay.
app.get('/examples/trigger', (c) => {
  return c.html(
    <Layout>
      <div id="content-container">No content yet.</div>

      <input
        name="text"
        hx-get="/bold"
        hx-target="#content-container"
        hx-trigger="keyup delay:0.5s"
      />
    </Layout>,
  );
});

// Different trigger and delay.
app.get('/examples/swap', (c) => {
  return c.html(
    <Layout>
      <ul id="my-list"></ul>

      <form hx-post="/list-items" hx-target="#my-list" hx-swap="beforeend">
        <input type="text" name="name" />
        <input type="submit" value="Submit" />
      </form>
    </Layout>,
  );
});

// If you're lazy, and it's fast enough, just hit the same page using hx-select.
app.get('/examples/select', (c) => {
  return c.html(
    <Layout>
      <div id="content-container">
        <strong>{c.req.query('text') || 'Empty'}</strong>
      </div>

      <input
        name="text"
        hx-get="/examples/4"
        hx-select="#content-container"
        hx-target="#content-container"
        hx-trigger="keyup delay:0.5s"
      />
    </Layout>,
  );
});

// Here's a TODO example.

let todos = [{ completed: false, id: 'example', name: 'Example' }];
const getTodo = (c) => {
  return todos.find((todo) => todo.id === c.req.param('id'));
};

const TodoCard: FC = ({ todo }) => {
  const todoPath = `/todos/${todo.id}`;
  const completionPath = `${todoPath}/completion`;
  const checkProps = todo.completed
    ? { 'hx-delete': completionPath, checked: true }
    : { 'hx-post': completionPath, checked: false };
  return (
    <li
      id={`todo-${todo.id}`}
      class="list-group-item d-flex align-items-center"
    >
      <input
        type="checkbox"
        hx-target="closest li"
        hx-swap="outerHTML"
        {...checkProps}
      />
      <div class="ms-2 flex-grow-1">{todo.name}</div>
      <button
        type="button"
        class="btn btn-sm btn-info"
        hx-get={`${todoPath}/edit-modal`}
        hx-target="#modals-here"
        data-bs-toggle="modal"
        data-bs-target="#modals-here"
      >
        Edit
      </button>
      <button
        type="button"
        class="btn btn-sm btn-danger ms-1"
        hx-delete={todoPath}
        hx-target="closest li"
        hx-swap="delete"
      >
        Delete
      </button>
    </li>
  );
};

app.get('/todos', (c) => {
  return c.html(
    <Layout>
      <div style="max-width: 400px">
        <form
          hx-post="/todos"
          hx-target="#todos"
          hx-swap="beforeend"
          {...{ 'hx-on::before-request': 'this.reset()' }}
        >
          <div class="form-group">
            <label for="text" class="form-label">
              Name
            </label>
            <input name="name" class="form-control" required />
          </div>
        </form>

        <hr />

        <ul id="todos" class="list-group">
          {todos.map((todo) => (
            <TodoCard todo={todo} />
          ))}
        </ul>
      </div>

      <div
        id="modals-here"
        class="modal modal-blur fade"
        aria-hidden="false"
        tabindex="-1"
      >
        <div
          class="modal-dialog modal-lg modal-dialog-centered"
          role="document"
        >
          <div class="modal-content"></div>
        </div>
      </div>
    </Layout>,
  );
});

app.post('/todos', async (c) => {
  const body = await c.req.parseBody();
  const todo = { id: Date.now().toString(), name: body.name };
  todos.push(todo);
  return c.html(<TodoCard todo={todo} />);
});

app.put('/todos/:id', async (c) => {
  const todo = getTodo(c);
  const body = await c.req.parseBody();
  todo.name = body.name;
  return c.html(<TodoCard todo={todo} />);
});

app.post('/todos/:id/completion', (c) => {
  const todo = getTodo(c);
  todo.completed = true;
  return c.html(<TodoCard todo={todo} />);
});

app.delete('/todos/:id/completion', (c) => {
  const todo = getTodo(c);
  todo.completed = false;
  return c.html(<TodoCard todo={todo} />);
});

app.get('/todos/:id/edit-modal', (c) => {
  const todo = getTodo(c);

  return c.html(
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Edit "{todo.name}"</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          />
        </div>
        <div class="modal-body">
          <form
            hx-put={`/todos/${todo.id}`}
            hx-target={`#todo-${todo.id}`}
            hx-swap="outerHTML"
            {...{
              'hx-on::after-request':
                "bootstrap.Modal.getInstance('#modals-here').hide()",
            }}
          >
            <div class="form-group">
              <label for="name" class="form-label">
                Name
              </label>
              <input
                type="text"
                name="name"
                value={todo.name}
                class="form-control"
                required
              />
            </div>
            <button type="submit" class="btn btn-primary mt-3">
              Submit
            </button>
          </form>
        </div>
      </div>
    </div>,
  );
});

app.delete('/todos/:id', (c) => {
  todos = todos.filter((todo) => todo.id !== c.req.param('id'));
  return c.text('', 200);
});

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({ fetch: app.fetch, port });
