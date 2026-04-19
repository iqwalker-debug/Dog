import { Route, Switch } from "wouter";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Sermons } from "./pages/Sermons";
import { SermonDetail } from "./pages/SermonDetail";
import { Events } from "./pages/Events";
import { EventDetail } from "./pages/EventDetail";
import { About } from "./pages/About";
import { Give } from "./pages/Give";

export function App() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/sermons" component={Sermons} />
        <Route path="/sermons/:id" component={SermonDetail} />
        <Route path="/events" component={Events} />
        <Route path="/events/:id" component={EventDetail} />
        <Route path="/about" component={About} />
        <Route path="/give" component={Give} />
        <Route>
          <div className="mx-auto max-w-5xl px-4 py-24 text-center">
            <h1 className="text-3xl text-brand-600">Page not found</h1>
            <p className="mt-2 text-ink-muted">Try the navigation above.</p>
          </div>
        </Route>
      </Switch>
    </Layout>
  );
}
