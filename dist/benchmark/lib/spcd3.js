// SPCD3 version 1.0.0 ESM
var noop$1 = {value: () => {}};

function dispatch() {
  for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
    if (!(t = arguments[i] + "") || (t in _) || /[\s.]/.test(t)) throw new Error("illegal type: " + t);
    _[t] = [];
  }
  return new Dispatch(_);
}

function Dispatch(_) {
  this._ = _;
}

function parseTypenames$1(typenames, types) {
  return typenames.trim().split(/^|\s+/).map(function(t) {
    var name = "", i = t.indexOf(".");
    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
    if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
    return {type: t, name: name};
  });
}

Dispatch.prototype = dispatch.prototype = {
  constructor: Dispatch,
  on: function(typename, callback) {
    var _ = this._,
        T = parseTypenames$1(typename + "", _),
        t,
        i = -1,
        n = T.length;

    // If no callback was specified, return the callback of the given type and name.
    if (arguments.length < 2) {
      while (++i < n) if ((t = (typename = T[i]).type) && (t = get$1(_[t], typename.name))) return t;
      return;
    }

    // If a type was specified, set the callback for the given type and name.
    // Otherwise, if a null callback was specified, remove callbacks of the given name.
    if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
    while (++i < n) {
      if (t = (typename = T[i]).type) _[t] = set$1(_[t], typename.name, callback);
      else if (callback == null) for (t in _) _[t] = set$1(_[t], typename.name, null);
    }

    return this;
  },
  copy: function() {
    var copy = {}, _ = this._;
    for (var t in _) copy[t] = _[t].slice();
    return new Dispatch(copy);
  },
  call: function(type, that) {
    if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
    for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
  },
  apply: function(type, that, args) {
    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
    for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
  }
};

function get$1(type, name) {
  for (var i = 0, n = type.length, c; i < n; ++i) {
    if ((c = type[i]).name === name) {
      return c.value;
    }
  }
}

function set$1(type, name, callback) {
  for (var i = 0, n = type.length; i < n; ++i) {
    if (type[i].name === name) {
      type[i] = noop$1, type = type.slice(0, i).concat(type.slice(i + 1));
      break;
    }
  }
  if (callback != null) type.push({name: name, value: callback});
  return type;
}

var xhtml = "http://www.w3.org/1999/xhtml";

var namespaces = {
  svg: "http://www.w3.org/2000/svg",
  xhtml: xhtml,
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
  xmlns: "http://www.w3.org/2000/xmlns/"
};

function namespace(name) {
  var prefix = name += "", i = prefix.indexOf(":");
  if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
  return namespaces.hasOwnProperty(prefix) ? {space: namespaces[prefix], local: name} : name; // eslint-disable-line no-prototype-builtins
}

function creatorInherit(name) {
  return function() {
    var document = this.ownerDocument,
        uri = this.namespaceURI;
    return uri === xhtml && document.documentElement.namespaceURI === xhtml
        ? document.createElement(name)
        : document.createElementNS(uri, name);
  };
}

function creatorFixed(fullname) {
  return function() {
    return this.ownerDocument.createElementNS(fullname.space, fullname.local);
  };
}

function creator(name) {
  var fullname = namespace(name);
  return (fullname.local
      ? creatorFixed
      : creatorInherit)(fullname);
}

function none() {}

function selector(selector) {
  return selector == null ? none : function() {
    return this.querySelector(selector);
  };
}

function selection_select(select) {
  if (typeof select !== "function") select = selector(select);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
      if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
        if ("__data__" in node) subnode.__data__ = node.__data__;
        subgroup[i] = subnode;
      }
    }
  }

  return new Selection$1(subgroups, this._parents);
}

// Given something array like (or null), returns something that is strictly an
// array. This is used to ensure that array-like objects passed to d3.selectAll
// or selection.selectAll are converted into proper arrays when creating a
// selection; we don’t ever want to create a selection backed by a live
// HTMLCollection or NodeList. However, note that selection.selectAll will use a
// static NodeList as a group, since it safely derived from querySelectorAll.
function array$1(x) {
  return x == null ? [] : Array.isArray(x) ? x : Array.from(x);
}

function empty() {
  return [];
}

function selectorAll(selector) {
  return selector == null ? empty : function() {
    return this.querySelectorAll(selector);
  };
}

function arrayAll(select) {
  return function() {
    return array$1(select.apply(this, arguments));
  };
}

function selection_selectAll(select) {
  if (typeof select === "function") select = arrayAll(select);
  else select = selectorAll(select);

  for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        subgroups.push(select.call(node, node.__data__, i, group));
        parents.push(node);
      }
    }
  }

  return new Selection$1(subgroups, parents);
}

function matcher(selector) {
  return function() {
    return this.matches(selector);
  };
}

function childMatcher(selector) {
  return function(node) {
    return node.matches(selector);
  };
}

var find = Array.prototype.find;

function childFind(match) {
  return function() {
    return find.call(this.children, match);
  };
}

function childFirst() {
  return this.firstElementChild;
}

function selection_selectChild(match) {
  return this.select(match == null ? childFirst
      : childFind(typeof match === "function" ? match : childMatcher(match)));
}

var filter$1 = Array.prototype.filter;

function children() {
  return Array.from(this.children);
}

function childrenFilter(match) {
  return function() {
    return filter$1.call(this.children, match);
  };
}

function selection_selectChildren(match) {
  return this.selectAll(match == null ? children
      : childrenFilter(typeof match === "function" ? match : childMatcher(match)));
}

function selection_filter(match) {
  if (typeof match !== "function") match = matcher(match);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
        subgroup.push(node);
      }
    }
  }

  return new Selection$1(subgroups, this._parents);
}

function sparse(update) {
  return new Array(update.length);
}

function selection_enter() {
  return new Selection$1(this._enter || this._groups.map(sparse), this._parents);
}

function EnterNode(parent, datum) {
  this.ownerDocument = parent.ownerDocument;
  this.namespaceURI = parent.namespaceURI;
  this._next = null;
  this._parent = parent;
  this.__data__ = datum;
}

EnterNode.prototype = {
  constructor: EnterNode,
  appendChild: function(child) { return this._parent.insertBefore(child, this._next); },
  insertBefore: function(child, next) { return this._parent.insertBefore(child, next); },
  querySelector: function(selector) { return this._parent.querySelector(selector); },
  querySelectorAll: function(selector) { return this._parent.querySelectorAll(selector); }
};

function constant$3(x) {
  return function() {
    return x;
  };
}

function bindIndex(parent, group, enter, update, exit, data) {
  var i = 0,
      node,
      groupLength = group.length,
      dataLength = data.length;

  // Put any non-null nodes that fit into update.
  // Put any null nodes into enter.
  // Put any remaining data into enter.
  for (; i < dataLength; ++i) {
    if (node = group[i]) {
      node.__data__ = data[i];
      update[i] = node;
    } else {
      enter[i] = new EnterNode(parent, data[i]);
    }
  }

  // Put any non-null nodes that don’t fit into exit.
  for (; i < groupLength; ++i) {
    if (node = group[i]) {
      exit[i] = node;
    }
  }
}

function bindKey(parent, group, enter, update, exit, data, key) {
  var i,
      node,
      nodeByKeyValue = new Map,
      groupLength = group.length,
      dataLength = data.length,
      keyValues = new Array(groupLength),
      keyValue;

  // Compute the key for each node.
  // If multiple nodes have the same key, the duplicates are added to exit.
  for (i = 0; i < groupLength; ++i) {
    if (node = group[i]) {
      keyValues[i] = keyValue = key.call(node, node.__data__, i, group) + "";
      if (nodeByKeyValue.has(keyValue)) {
        exit[i] = node;
      } else {
        nodeByKeyValue.set(keyValue, node);
      }
    }
  }

  // Compute the key for each datum.
  // If there a node associated with this key, join and add it to update.
  // If there is not (or the key is a duplicate), add it to enter.
  for (i = 0; i < dataLength; ++i) {
    keyValue = key.call(parent, data[i], i, data) + "";
    if (node = nodeByKeyValue.get(keyValue)) {
      update[i] = node;
      node.__data__ = data[i];
      nodeByKeyValue.delete(keyValue);
    } else {
      enter[i] = new EnterNode(parent, data[i]);
    }
  }

  // Add any remaining nodes that were not bound to data to exit.
  for (i = 0; i < groupLength; ++i) {
    if ((node = group[i]) && (nodeByKeyValue.get(keyValues[i]) === node)) {
      exit[i] = node;
    }
  }
}

function datum(node) {
  return node.__data__;
}

function selection_data(value, key) {
  if (!arguments.length) return Array.from(this, datum);

  var bind = key ? bindKey : bindIndex,
      parents = this._parents,
      groups = this._groups;

  if (typeof value !== "function") value = constant$3(value);

  for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
    var parent = parents[j],
        group = groups[j],
        groupLength = group.length,
        data = arraylike(value.call(parent, parent && parent.__data__, j, parents)),
        dataLength = data.length,
        enterGroup = enter[j] = new Array(dataLength),
        updateGroup = update[j] = new Array(dataLength),
        exitGroup = exit[j] = new Array(groupLength);

    bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);

    // Now connect the enter nodes to their following update node, such that
    // appendChild can insert the materialized enter node before this node,
    // rather than at the end of the parent node.
    for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
      if (previous = enterGroup[i0]) {
        if (i0 >= i1) i1 = i0 + 1;
        while (!(next = updateGroup[i1]) && ++i1 < dataLength);
        previous._next = next || null;
      }
    }
  }

  update = new Selection$1(update, parents);
  update._enter = enter;
  update._exit = exit;
  return update;
}

// Given some data, this returns an array-like view of it: an object that
// exposes a length property and allows numeric indexing. Note that unlike
// selectAll, this isn’t worried about “live” collections because the resulting
// array will only be used briefly while data is being bound. (It is possible to
// cause the data to change while iterating by using a key function, but please
// don’t; we’d rather avoid a gratuitous copy.)
function arraylike(data) {
  return typeof data === "object" && "length" in data
    ? data // Array, TypedArray, NodeList, array-like
    : Array.from(data); // Map, Set, iterable, string, or anything else
}

function selection_exit() {
  return new Selection$1(this._exit || this._groups.map(sparse), this._parents);
}

function selection_join(onenter, onupdate, onexit) {
  var enter = this.enter(), update = this, exit = this.exit();
  if (typeof onenter === "function") {
    enter = onenter(enter);
    if (enter) enter = enter.selection();
  } else {
    enter = enter.append(onenter + "");
  }
  if (onupdate != null) {
    update = onupdate(update);
    if (update) update = update.selection();
  }
  if (onexit == null) exit.remove(); else onexit(exit);
  return enter && update ? enter.merge(update).order() : update;
}

function selection_merge(context) {
  var selection = context.selection ? context.selection() : context;

  for (var groups0 = this._groups, groups1 = selection._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
    for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group0[i] || group1[i]) {
        merge[i] = node;
      }
    }
  }

  for (; j < m0; ++j) {
    merges[j] = groups0[j];
  }

  return new Selection$1(merges, this._parents);
}

function selection_order() {

  for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) {
    for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
      if (node = group[i]) {
        if (next && node.compareDocumentPosition(next) ^ 4) next.parentNode.insertBefore(node, next);
        next = node;
      }
    }
  }

  return this;
}

function selection_sort(compare) {
  if (!compare) compare = ascending$1;

  function compareNode(a, b) {
    return a && b ? compare(a.__data__, b.__data__) : !a - !b;
  }

  for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        sortgroup[i] = node;
      }
    }
    sortgroup.sort(compareNode);
  }

  return new Selection$1(sortgroups, this._parents).order();
}

function ascending$1(a, b) {
  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}

function selection_call() {
  var callback = arguments[0];
  arguments[0] = this;
  callback.apply(null, arguments);
  return this;
}

function selection_nodes() {
  return Array.from(this);
}

function selection_node() {

  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
      var node = group[i];
      if (node) return node;
    }
  }

  return null;
}

function selection_size() {
  let size = 0;
  for (const node of this) ++size; // eslint-disable-line no-unused-vars
  return size;
}

function selection_empty() {
  return !this.node();
}

function selection_each(callback) {

  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
      if (node = group[i]) callback.call(node, node.__data__, i, group);
    }
  }

  return this;
}

function attrRemove$1(name) {
  return function() {
    this.removeAttribute(name);
  };
}

function attrRemoveNS$1(fullname) {
  return function() {
    this.removeAttributeNS(fullname.space, fullname.local);
  };
}

function attrConstant$1(name, value) {
  return function() {
    this.setAttribute(name, value);
  };
}

function attrConstantNS$1(fullname, value) {
  return function() {
    this.setAttributeNS(fullname.space, fullname.local, value);
  };
}

function attrFunction$1(name, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.removeAttribute(name);
    else this.setAttribute(name, v);
  };
}

function attrFunctionNS$1(fullname, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
    else this.setAttributeNS(fullname.space, fullname.local, v);
  };
}

function selection_attr(name, value) {
  var fullname = namespace(name);

  if (arguments.length < 2) {
    var node = this.node();
    return fullname.local
        ? node.getAttributeNS(fullname.space, fullname.local)
        : node.getAttribute(fullname);
  }

  return this.each((value == null
      ? (fullname.local ? attrRemoveNS$1 : attrRemove$1) : (typeof value === "function"
      ? (fullname.local ? attrFunctionNS$1 : attrFunction$1)
      : (fullname.local ? attrConstantNS$1 : attrConstant$1)))(fullname, value));
}

function defaultView(node) {
  return (node.ownerDocument && node.ownerDocument.defaultView) // node is a Node
      || (node.document && node) // node is a Window
      || node.defaultView; // node is a Document
}

function styleRemove$1(name) {
  return function() {
    this.style.removeProperty(name);
  };
}

function styleConstant$1(name, value, priority) {
  return function() {
    this.style.setProperty(name, value, priority);
  };
}

function styleFunction$1(name, value, priority) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.style.removeProperty(name);
    else this.style.setProperty(name, v, priority);
  };
}

function selection_style(name, value, priority) {
  return arguments.length > 1
      ? this.each((value == null
            ? styleRemove$1 : typeof value === "function"
            ? styleFunction$1
            : styleConstant$1)(name, value, priority == null ? "" : priority))
      : styleValue(this.node(), name);
}

function styleValue(node, name) {
  return node.style.getPropertyValue(name)
      || defaultView(node).getComputedStyle(node, null).getPropertyValue(name);
}

function propertyRemove(name) {
  return function() {
    delete this[name];
  };
}

function propertyConstant(name, value) {
  return function() {
    this[name] = value;
  };
}

function propertyFunction(name, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) delete this[name];
    else this[name] = v;
  };
}

function selection_property(name, value) {
  return arguments.length > 1
      ? this.each((value == null
          ? propertyRemove : typeof value === "function"
          ? propertyFunction
          : propertyConstant)(name, value))
      : this.node()[name];
}

function classArray(string) {
  return string.trim().split(/^|\s+/);
}

function classList(node) {
  return node.classList || new ClassList(node);
}

function ClassList(node) {
  this._node = node;
  this._names = classArray(node.getAttribute("class") || "");
}

ClassList.prototype = {
  add: function(name) {
    var i = this._names.indexOf(name);
    if (i < 0) {
      this._names.push(name);
      this._node.setAttribute("class", this._names.join(" "));
    }
  },
  remove: function(name) {
    var i = this._names.indexOf(name);
    if (i >= 0) {
      this._names.splice(i, 1);
      this._node.setAttribute("class", this._names.join(" "));
    }
  },
  contains: function(name) {
    return this._names.indexOf(name) >= 0;
  }
};

function classedAdd(node, names) {
  var list = classList(node), i = -1, n = names.length;
  while (++i < n) list.add(names[i]);
}

function classedRemove(node, names) {
  var list = classList(node), i = -1, n = names.length;
  while (++i < n) list.remove(names[i]);
}

function classedTrue(names) {
  return function() {
    classedAdd(this, names);
  };
}

function classedFalse(names) {
  return function() {
    classedRemove(this, names);
  };
}

function classedFunction(names, value) {
  return function() {
    (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
  };
}

function selection_classed(name, value) {
  var names = classArray(name + "");

  if (arguments.length < 2) {
    var list = classList(this.node()), i = -1, n = names.length;
    while (++i < n) if (!list.contains(names[i])) return false;
    return true;
  }

  return this.each((typeof value === "function"
      ? classedFunction : value
      ? classedTrue
      : classedFalse)(names, value));
}

function textRemove() {
  this.textContent = "";
}

function textConstant$1(value) {
  return function() {
    this.textContent = value;
  };
}

function textFunction$1(value) {
  return function() {
    var v = value.apply(this, arguments);
    this.textContent = v == null ? "" : v;
  };
}

function selection_text(value) {
  return arguments.length
      ? this.each(value == null
          ? textRemove : (typeof value === "function"
          ? textFunction$1
          : textConstant$1)(value))
      : this.node().textContent;
}

function htmlRemove() {
  this.innerHTML = "";
}

function htmlConstant(value) {
  return function() {
    this.innerHTML = value;
  };
}

function htmlFunction(value) {
  return function() {
    var v = value.apply(this, arguments);
    this.innerHTML = v == null ? "" : v;
  };
}

function selection_html(value) {
  return arguments.length
      ? this.each(value == null
          ? htmlRemove : (typeof value === "function"
          ? htmlFunction
          : htmlConstant)(value))
      : this.node().innerHTML;
}

function raise() {
  if (this.nextSibling) this.parentNode.appendChild(this);
}

function selection_raise() {
  return this.each(raise);
}

function lower() {
  if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
}

function selection_lower() {
  return this.each(lower);
}

function selection_append(name) {
  var create = typeof name === "function" ? name : creator(name);
  return this.select(function() {
    return this.appendChild(create.apply(this, arguments));
  });
}

function constantNull() {
  return null;
}

function selection_insert(name, before) {
  var create = typeof name === "function" ? name : creator(name),
      select = before == null ? constantNull : typeof before === "function" ? before : selector(before);
  return this.select(function() {
    return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
  });
}

function remove() {
  var parent = this.parentNode;
  if (parent) parent.removeChild(this);
}

function selection_remove() {
  return this.each(remove);
}

function selection_cloneShallow() {
  var clone = this.cloneNode(false), parent = this.parentNode;
  return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
}

function selection_cloneDeep() {
  var clone = this.cloneNode(true), parent = this.parentNode;
  return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
}

function selection_clone(deep) {
  return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
}

function selection_datum(value) {
  return arguments.length
      ? this.property("__data__", value)
      : this.node().__data__;
}

function contextListener(listener) {
  return function(event) {
    listener.call(this, event, this.__data__);
  };
}

function parseTypenames(typenames) {
  return typenames.trim().split(/^|\s+/).map(function(t) {
    var name = "", i = t.indexOf(".");
    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
    return {type: t, name: name};
  });
}

function onRemove(typename) {
  return function() {
    var on = this.__on;
    if (!on) return;
    for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
      if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
        this.removeEventListener(o.type, o.listener, o.options);
      } else {
        on[++i] = o;
      }
    }
    if (++i) on.length = i;
    else delete this.__on;
  };
}

function onAdd(typename, value, options) {
  return function() {
    var on = this.__on, o, listener = contextListener(value);
    if (on) for (var j = 0, m = on.length; j < m; ++j) {
      if ((o = on[j]).type === typename.type && o.name === typename.name) {
        this.removeEventListener(o.type, o.listener, o.options);
        this.addEventListener(o.type, o.listener = listener, o.options = options);
        o.value = value;
        return;
      }
    }
    this.addEventListener(typename.type, listener, options);
    o = {type: typename.type, name: typename.name, value: value, listener: listener, options: options};
    if (!on) this.__on = [o];
    else on.push(o);
  };
}

function selection_on(typename, value, options) {
  var typenames = parseTypenames(typename + ""), i, n = typenames.length, t;

  if (arguments.length < 2) {
    var on = this.node().__on;
    if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
      for (i = 0, o = on[j]; i < n; ++i) {
        if ((t = typenames[i]).type === o.type && t.name === o.name) {
          return o.value;
        }
      }
    }
    return;
  }

  on = value ? onAdd : onRemove;
  for (i = 0; i < n; ++i) this.each(on(typenames[i], value, options));
  return this;
}

function dispatchEvent(node, type, params) {
  var window = defaultView(node),
      event = window.CustomEvent;

  if (typeof event === "function") {
    event = new event(type, params);
  } else {
    event = window.document.createEvent("Event");
    if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
    else event.initEvent(type, false, false);
  }

  node.dispatchEvent(event);
}

function dispatchConstant(type, params) {
  return function() {
    return dispatchEvent(this, type, params);
  };
}

function dispatchFunction(type, params) {
  return function() {
    return dispatchEvent(this, type, params.apply(this, arguments));
  };
}

function selection_dispatch(type, params) {
  return this.each((typeof params === "function"
      ? dispatchFunction
      : dispatchConstant)(type, params));
}

function* selection_iterator() {
  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
      if (node = group[i]) yield node;
    }
  }
}

var root = [null];

function Selection$1(groups, parents) {
  this._groups = groups;
  this._parents = parents;
}

function selection() {
  return new Selection$1([[document.documentElement]], root);
}

function selection_selection() {
  return this;
}

Selection$1.prototype = selection.prototype = {
  constructor: Selection$1,
  select: selection_select,
  selectAll: selection_selectAll,
  selectChild: selection_selectChild,
  selectChildren: selection_selectChildren,
  filter: selection_filter,
  data: selection_data,
  enter: selection_enter,
  exit: selection_exit,
  join: selection_join,
  merge: selection_merge,
  selection: selection_selection,
  order: selection_order,
  sort: selection_sort,
  call: selection_call,
  nodes: selection_nodes,
  node: selection_node,
  size: selection_size,
  empty: selection_empty,
  each: selection_each,
  attr: selection_attr,
  style: selection_style,
  property: selection_property,
  classed: selection_classed,
  text: selection_text,
  html: selection_html,
  raise: selection_raise,
  lower: selection_lower,
  append: selection_append,
  insert: selection_insert,
  remove: selection_remove,
  clone: selection_clone,
  datum: selection_datum,
  on: selection_on,
  dispatch: selection_dispatch,
  [Symbol.iterator]: selection_iterator
};

function select(selector) {
  return typeof selector === "string"
      ? new Selection$1([[document.querySelector(selector)]], [document.documentElement])
      : new Selection$1([[selector]], root);
}

function create$1(name) {
  return select(creator(name).call(document.documentElement));
}

var nextId = 0;

function Local() {
  this._ = "@" + (++nextId).toString(36);
}

Local.prototype = {
  constructor: Local,
  get: function(node) {
    var id = this._;
    while (!(id in node)) if (!(node = node.parentNode)) return;
    return node[id];
  },
  set: function(node, value) {
    return node[this._] = value;
  },
  remove: function(node) {
    return this._ in node && delete node[this._];
  },
  toString: function() {
    return this._;
  }
};

function sourceEvent(event) {
  let sourceEvent;
  while (sourceEvent = event.sourceEvent) event = sourceEvent;
  return event;
}

function pointer(event, node) {
  event = sourceEvent(event);
  if (node === undefined) node = event.currentTarget;
  if (node) {
    var svg = node.ownerSVGElement || node;
    if (svg.createSVGPoint) {
      var point = svg.createSVGPoint();
      point.x = event.clientX, point.y = event.clientY;
      point = point.matrixTransform(node.getScreenCTM().inverse());
      return [point.x, point.y];
    }
    if (node.getBoundingClientRect) {
      var rect = node.getBoundingClientRect();
      return [event.clientX - rect.left - node.clientLeft, event.clientY - rect.top - node.clientTop];
    }
  }
  return [event.pageX, event.pageY];
}

function selectAll(selector) {
  return typeof selector === "string"
      ? new Selection$1([document.querySelectorAll(selector)], [document.documentElement])
      : new Selection$1([array$1(selector)], root);
}

// These are typically used in conjunction with noevent to ensure that we can
// preventDefault on the event.
const nonpassive = {passive: false};
const nonpassivecapture = {capture: true, passive: false};

function nopropagation(event) {
  event.stopImmediatePropagation();
}

function noevent(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
}

function nodrag(view) {
  var root = view.document.documentElement,
      selection = select(view).on("dragstart.drag", noevent, nonpassivecapture);
  if ("onselectstart" in root) {
    selection.on("selectstart.drag", noevent, nonpassivecapture);
  } else {
    root.__noselect = root.style.MozUserSelect;
    root.style.MozUserSelect = "none";
  }
}

function yesdrag(view, noclick) {
  var root = view.document.documentElement,
      selection = select(view).on("dragstart.drag", null);
  if (noclick) {
    selection.on("click.drag", noevent, nonpassivecapture);
    setTimeout(function() { selection.on("click.drag", null); }, 0);
  }
  if ("onselectstart" in root) {
    selection.on("selectstart.drag", null);
  } else {
    root.style.MozUserSelect = root.__noselect;
    delete root.__noselect;
  }
}

var constant$2 = x => () => x;

function DragEvent(type, {
  sourceEvent,
  subject,
  target,
  identifier,
  active,
  x, y, dx, dy,
  dispatch
}) {
  Object.defineProperties(this, {
    type: {value: type, enumerable: true, configurable: true},
    sourceEvent: {value: sourceEvent, enumerable: true, configurable: true},
    subject: {value: subject, enumerable: true, configurable: true},
    target: {value: target, enumerable: true, configurable: true},
    identifier: {value: identifier, enumerable: true, configurable: true},
    active: {value: active, enumerable: true, configurable: true},
    x: {value: x, enumerable: true, configurable: true},
    y: {value: y, enumerable: true, configurable: true},
    dx: {value: dx, enumerable: true, configurable: true},
    dy: {value: dy, enumerable: true, configurable: true},
    _: {value: dispatch}
  });
}

DragEvent.prototype.on = function() {
  var value = this._.on.apply(this._, arguments);
  return value === this._ ? this : value;
};

// Ignore right-click, since that should open the context menu.
function defaultFilter(event) {
  return !event.ctrlKey && !event.button;
}

function defaultContainer() {
  return this.parentNode;
}

function defaultSubject(event, d) {
  return d == null ? {x: event.x, y: event.y} : d;
}

function defaultTouchable() {
  return navigator.maxTouchPoints || ("ontouchstart" in this);
}

function drag() {
  var filter = defaultFilter,
      container = defaultContainer,
      subject = defaultSubject,
      touchable = defaultTouchable,
      gestures = {},
      listeners = dispatch("start", "drag", "end"),
      active = 0,
      mousedownx,
      mousedowny,
      mousemoving,
      touchending,
      clickDistance2 = 0;

  function drag(selection) {
    selection
        .on("mousedown.drag", mousedowned)
      .filter(touchable)
        .on("touchstart.drag", touchstarted)
        .on("touchmove.drag", touchmoved, nonpassive)
        .on("touchend.drag touchcancel.drag", touchended)
        .style("touch-action", "none")
        .style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
  }

  function mousedowned(event, d) {
    if (touchending || !filter.call(this, event, d)) return;
    var gesture = beforestart(this, container.call(this, event, d), event, d, "mouse");
    if (!gesture) return;
    select(event.view)
      .on("mousemove.drag", mousemoved, nonpassivecapture)
      .on("mouseup.drag", mouseupped, nonpassivecapture);
    nodrag(event.view);
    nopropagation(event);
    mousemoving = false;
    mousedownx = event.clientX;
    mousedowny = event.clientY;
    gesture("start", event);
  }

  function mousemoved(event) {
    noevent(event);
    if (!mousemoving) {
      var dx = event.clientX - mousedownx, dy = event.clientY - mousedowny;
      mousemoving = dx * dx + dy * dy > clickDistance2;
    }
    gestures.mouse("drag", event);
  }

  function mouseupped(event) {
    select(event.view).on("mousemove.drag mouseup.drag", null);
    yesdrag(event.view, mousemoving);
    noevent(event);
    gestures.mouse("end", event);
  }

  function touchstarted(event, d) {
    if (!filter.call(this, event, d)) return;
    var touches = event.changedTouches,
        c = container.call(this, event, d),
        n = touches.length, i, gesture;

    for (i = 0; i < n; ++i) {
      if (gesture = beforestart(this, c, event, d, touches[i].identifier, touches[i])) {
        nopropagation(event);
        gesture("start", event, touches[i]);
      }
    }
  }

  function touchmoved(event) {
    var touches = event.changedTouches,
        n = touches.length, i, gesture;

    for (i = 0; i < n; ++i) {
      if (gesture = gestures[touches[i].identifier]) {
        noevent(event);
        gesture("drag", event, touches[i]);
      }
    }
  }

  function touchended(event) {
    var touches = event.changedTouches,
        n = touches.length, i, gesture;

    if (touchending) clearTimeout(touchending);
    touchending = setTimeout(function() { touchending = null; }, 500); // Ghost clicks are delayed!
    for (i = 0; i < n; ++i) {
      if (gesture = gestures[touches[i].identifier]) {
        nopropagation(event);
        gesture("end", event, touches[i]);
      }
    }
  }

  function beforestart(that, container, event, d, identifier, touch) {
    var dispatch = listeners.copy(),
        p = pointer(touch || event, container), dx, dy,
        s;

    if ((s = subject.call(that, new DragEvent("beforestart", {
        sourceEvent: event,
        target: drag,
        identifier,
        active,
        x: p[0],
        y: p[1],
        dx: 0,
        dy: 0,
        dispatch
      }), d)) == null) return;

    dx = s.x - p[0] || 0;
    dy = s.y - p[1] || 0;

    return function gesture(type, event, touch) {
      var p0 = p, n;
      switch (type) {
        case "start": gestures[identifier] = gesture, n = active++; break;
        case "end": delete gestures[identifier], --active; // falls through
        case "drag": p = pointer(touch || event, container), n = active; break;
      }
      dispatch.call(
        type,
        that,
        new DragEvent(type, {
          sourceEvent: event,
          subject: s,
          target: drag,
          identifier,
          active: n,
          x: p[0] + dx,
          y: p[1] + dy,
          dx: p[0] - p0[0],
          dy: p[1] - p0[1],
          dispatch
        }),
        d
      );
    };
  }

  drag.filter = function(_) {
    return arguments.length ? (filter = typeof _ === "function" ? _ : constant$2(!!_), drag) : filter;
  };

  drag.container = function(_) {
    return arguments.length ? (container = typeof _ === "function" ? _ : constant$2(_), drag) : container;
  };

  drag.subject = function(_) {
    return arguments.length ? (subject = typeof _ === "function" ? _ : constant$2(_), drag) : subject;
  };

  drag.touchable = function(_) {
    return arguments.length ? (touchable = typeof _ === "function" ? _ : constant$2(!!_), drag) : touchable;
  };

  drag.on = function() {
    var value = listeners.on.apply(listeners, arguments);
    return value === listeners ? drag : value;
  };

  drag.clickDistance = function(_) {
    return arguments.length ? (clickDistance2 = (_ = +_) * _, drag) : Math.sqrt(clickDistance2);
  };

  return drag;
}

function cubicInOut(t) {
  return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
}

var exponent$1 = 3;

((function custom(e) {
  e = +e;

  function polyIn(t) {
    return Math.pow(t, e);
  }

  polyIn.exponent = custom;

  return polyIn;
}))(exponent$1);

((function custom(e) {
  e = +e;

  function polyOut(t) {
    return 1 - Math.pow(1 - t, e);
  }

  polyOut.exponent = custom;

  return polyOut;
}))(exponent$1);

((function custom(e) {
  e = +e;

  function polyInOut(t) {
    return ((t *= 2) <= 1 ? Math.pow(t, e) : 2 - Math.pow(2 - t, e)) / 2;
  }

  polyInOut.exponent = custom;

  return polyInOut;
}))(exponent$1);

// tpmt is two power minus ten times t scaled to [0,1]
function tpmt(x) {
  return (Math.pow(2, -10 * x) - 0.0009765625) * 1.0009775171065494;
}

var overshoot = 1.70158;

((function custom(s) {
  s = +s;

  function backIn(t) {
    return (t = +t) * t * (s * (t - 1) + t);
  }

  backIn.overshoot = custom;

  return backIn;
}))(overshoot);

((function custom(s) {
  s = +s;

  function backOut(t) {
    return --t * t * ((t + 1) * s + t) + 1;
  }

  backOut.overshoot = custom;

  return backOut;
}))(overshoot);

((function custom(s) {
  s = +s;

  function backInOut(t) {
    return ((t *= 2) < 1 ? t * t * ((s + 1) * t - s) : (t -= 2) * t * ((s + 1) * t + s) + 2) / 2;
  }

  backInOut.overshoot = custom;

  return backInOut;
}))(overshoot);

var tau$1 = 2 * Math.PI,
    amplitude = 1,
    period = 0.3;

((function custom(a, p) {
  var s = Math.asin(1 / (a = Math.max(1, a))) * (p /= tau$1);

  function elasticIn(t) {
    return a * tpmt(-(--t)) * Math.sin((s - t) / p);
  }

  elasticIn.amplitude = function(a) { return custom(a, p * tau$1); };
  elasticIn.period = function(p) { return custom(a, p); };

  return elasticIn;
}))(amplitude, period);

((function custom(a, p) {
  var s = Math.asin(1 / (a = Math.max(1, a))) * (p /= tau$1);

  function elasticOut(t) {
    return 1 - a * tpmt(t = +t) * Math.sin((t + s) / p);
  }

  elasticOut.amplitude = function(a) { return custom(a, p * tau$1); };
  elasticOut.period = function(p) { return custom(a, p); };

  return elasticOut;
}))(amplitude, period);

((function custom(a, p) {
  var s = Math.asin(1 / (a = Math.max(1, a))) * (p /= tau$1);

  function elasticInOut(t) {
    return ((t = t * 2 - 1) < 0
        ? a * tpmt(-t) * Math.sin((s - t) / p)
        : 2 - a * tpmt(t) * Math.sin((s + t) / p)) / 2;
  }

  elasticInOut.amplitude = function(a) { return custom(a, p * tau$1); };
  elasticInOut.period = function(p) { return custom(a, p); };

  return elasticInOut;
}))(amplitude, period);

var frame = 0, // is an animation frame pending?
    timeout$1 = 0, // is a timeout pending?
    interval = 0, // are any timers active?
    pokeDelay = 1000, // how frequently we check for clock skew
    taskHead,
    taskTail,
    clockLast = 0,
    clockNow = 0,
    clockSkew = 0,
    clock = typeof performance === "object" && performance.now ? performance : Date,
    setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) { setTimeout(f, 17); };

function now() {
  return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
}

function clearNow() {
  clockNow = 0;
}

function Timer() {
  this._call =
  this._time =
  this._next = null;
}

Timer.prototype = timer$1.prototype = {
  constructor: Timer,
  restart: function(callback, delay, time) {
    if (typeof callback !== "function") throw new TypeError("callback is not a function");
    time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
    if (!this._next && taskTail !== this) {
      if (taskTail) taskTail._next = this;
      else taskHead = this;
      taskTail = this;
    }
    this._call = callback;
    this._time = time;
    sleep();
  },
  stop: function() {
    if (this._call) {
      this._call = null;
      this._time = Infinity;
      sleep();
    }
  }
};

function timer$1(callback, delay, time) {
  var t = new Timer;
  t.restart(callback, delay, time);
  return t;
}

function timerFlush() {
  now(); // Get the current time, if not already set.
  ++frame; // Pretend we’ve set an alarm, if we haven’t already.
  var t = taskHead, e;
  while (t) {
    if ((e = clockNow - t._time) >= 0) t._call.call(undefined, e);
    t = t._next;
  }
  --frame;
}

function wake() {
  clockNow = (clockLast = clock.now()) + clockSkew;
  frame = timeout$1 = 0;
  try {
    timerFlush();
  } finally {
    frame = 0;
    nap();
    clockNow = 0;
  }
}

function poke() {
  var now = clock.now(), delay = now - clockLast;
  if (delay > pokeDelay) clockSkew -= delay, clockLast = now;
}

function nap() {
  var t0, t1 = taskHead, t2, time = Infinity;
  while (t1) {
    if (t1._call) {
      if (time > t1._time) time = t1._time;
      t0 = t1, t1 = t1._next;
    } else {
      t2 = t1._next, t1._next = null;
      t1 = t0 ? t0._next = t2 : taskHead = t2;
    }
  }
  taskTail = t0;
  sleep(time);
}

function sleep(time) {
  if (frame) return; // Soonest alarm already set, or will be.
  if (timeout$1) timeout$1 = clearTimeout(timeout$1);
  var delay = time - clockNow; // Strictly less than if we recomputed clockNow.
  if (delay > 24) {
    if (time < Infinity) timeout$1 = setTimeout(wake, time - clock.now() - clockSkew);
    if (interval) interval = clearInterval(interval);
  } else {
    if (!interval) clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
    frame = 1, setFrame(wake);
  }
}

function timeout(callback, delay, time) {
  var t = new Timer;
  delay = delay == null ? 0 : +delay;
  t.restart(elapsed => {
    t.stop();
    callback(elapsed + delay);
  }, delay, time);
  return t;
}

var emptyOn = dispatch("start", "end", "cancel", "interrupt");
var emptyTween = [];

var CREATED = 0;
var SCHEDULED = 1;
var STARTING = 2;
var STARTED = 3;
var RUNNING = 4;
var ENDING = 5;
var ENDED = 6;

function schedule(node, name, id, index, group, timing) {
  var schedules = node.__transition;
  if (!schedules) node.__transition = {};
  else if (id in schedules) return;
  create(node, id, {
    name: name,
    index: index, // For context during callback.
    group: group, // For context during callback.
    on: emptyOn,
    tween: emptyTween,
    time: timing.time,
    delay: timing.delay,
    duration: timing.duration,
    ease: timing.ease,
    timer: null,
    state: CREATED
  });
}

function init(node, id) {
  var schedule = get(node, id);
  if (schedule.state > CREATED) throw new Error("too late; already scheduled");
  return schedule;
}

function set(node, id) {
  var schedule = get(node, id);
  if (schedule.state > STARTED) throw new Error("too late; already running");
  return schedule;
}

function get(node, id) {
  var schedule = node.__transition;
  if (!schedule || !(schedule = schedule[id])) throw new Error("transition not found");
  return schedule;
}

function create(node, id, self) {
  var schedules = node.__transition,
      tween;

  // Initialize the self timer when the transition is created.
  // Note the actual delay is not known until the first callback!
  schedules[id] = self;
  self.timer = timer$1(schedule, 0, self.time);

  function schedule(elapsed) {
    self.state = SCHEDULED;
    self.timer.restart(start, self.delay, self.time);

    // If the elapsed delay is less than our first sleep, start immediately.
    if (self.delay <= elapsed) start(elapsed - self.delay);
  }

  function start(elapsed) {
    var i, j, n, o;

    // If the state is not SCHEDULED, then we previously errored on start.
    if (self.state !== SCHEDULED) return stop();

    for (i in schedules) {
      o = schedules[i];
      if (o.name !== self.name) continue;

      // While this element already has a starting transition during this frame,
      // defer starting an interrupting transition until that transition has a
      // chance to tick (and possibly end); see d3/d3-transition#54!
      if (o.state === STARTED) return timeout(start);

      // Interrupt the active transition, if any.
      if (o.state === RUNNING) {
        o.state = ENDED;
        o.timer.stop();
        o.on.call("interrupt", node, node.__data__, o.index, o.group);
        delete schedules[i];
      }

      // Cancel any pre-empted transitions.
      else if (+i < id) {
        o.state = ENDED;
        o.timer.stop();
        o.on.call("cancel", node, node.__data__, o.index, o.group);
        delete schedules[i];
      }
    }

    // Defer the first tick to end of the current frame; see d3/d3#1576.
    // Note the transition may be canceled after start and before the first tick!
    // Note this must be scheduled before the start event; see d3/d3-transition#16!
    // Assuming this is successful, subsequent callbacks go straight to tick.
    timeout(function() {
      if (self.state === STARTED) {
        self.state = RUNNING;
        self.timer.restart(tick, self.delay, self.time);
        tick(elapsed);
      }
    });

    // Dispatch the start event.
    // Note this must be done before the tween are initialized.
    self.state = STARTING;
    self.on.call("start", node, node.__data__, self.index, self.group);
    if (self.state !== STARTING) return; // interrupted
    self.state = STARTED;

    // Initialize the tween, deleting null tween.
    tween = new Array(n = self.tween.length);
    for (i = 0, j = -1; i < n; ++i) {
      if (o = self.tween[i].value.call(node, node.__data__, self.index, self.group)) {
        tween[++j] = o;
      }
    }
    tween.length = j + 1;
  }

  function tick(elapsed) {
    var t = elapsed < self.duration ? self.ease.call(null, elapsed / self.duration) : (self.timer.restart(stop), self.state = ENDING, 1),
        i = -1,
        n = tween.length;

    while (++i < n) {
      tween[i].call(node, t);
    }

    // Dispatch the end event.
    if (self.state === ENDING) {
      self.on.call("end", node, node.__data__, self.index, self.group);
      stop();
    }
  }

  function stop() {
    self.state = ENDED;
    self.timer.stop();
    delete schedules[id];
    for (var i in schedules) return; // eslint-disable-line no-unused-vars
    delete node.__transition;
  }
}

function interrupt(node, name) {
  var schedules = node.__transition,
      schedule,
      active,
      empty = true,
      i;

  if (!schedules) return;

  name = name == null ? null : name + "";

  for (i in schedules) {
    if ((schedule = schedules[i]).name !== name) { empty = false; continue; }
    active = schedule.state > STARTING && schedule.state < ENDING;
    schedule.state = ENDED;
    schedule.timer.stop();
    schedule.on.call(active ? "interrupt" : "cancel", node, node.__data__, schedule.index, schedule.group);
    delete schedules[i];
  }

  if (empty) delete node.__transition;
}

function selection_interrupt(name) {
  return this.each(function() {
    interrupt(this, name);
  });
}

function define(constructor, factory, prototype) {
  constructor.prototype = factory.prototype = prototype;
  prototype.constructor = constructor;
}

function extend(parent, definition) {
  var prototype = Object.create(parent.prototype);
  for (var key in definition) prototype[key] = definition[key];
  return prototype;
}

function Color() {}

var darker = 0.7;
var brighter = 1 / darker;

var reI = "\\s*([+-]?\\d+)\\s*",
    reN = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*",
    reP = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*",
    reHex = /^#([0-9a-f]{3,8})$/,
    reRgbInteger = new RegExp(`^rgb\\(${reI},${reI},${reI}\\)$`),
    reRgbPercent = new RegExp(`^rgb\\(${reP},${reP},${reP}\\)$`),
    reRgbaInteger = new RegExp(`^rgba\\(${reI},${reI},${reI},${reN}\\)$`),
    reRgbaPercent = new RegExp(`^rgba\\(${reP},${reP},${reP},${reN}\\)$`),
    reHslPercent = new RegExp(`^hsl\\(${reN},${reP},${reP}\\)$`),
    reHslaPercent = new RegExp(`^hsla\\(${reN},${reP},${reP},${reN}\\)$`);

var named = {
  aliceblue: 0xf0f8ff,
  antiquewhite: 0xfaebd7,
  aqua: 0x00ffff,
  aquamarine: 0x7fffd4,
  azure: 0xf0ffff,
  beige: 0xf5f5dc,
  bisque: 0xffe4c4,
  black: 0x000000,
  blanchedalmond: 0xffebcd,
  blue: 0x0000ff,
  blueviolet: 0x8a2be2,
  brown: 0xa52a2a,
  burlywood: 0xdeb887,
  cadetblue: 0x5f9ea0,
  chartreuse: 0x7fff00,
  chocolate: 0xd2691e,
  coral: 0xff7f50,
  cornflowerblue: 0x6495ed,
  cornsilk: 0xfff8dc,
  crimson: 0xdc143c,
  cyan: 0x00ffff,
  darkblue: 0x00008b,
  darkcyan: 0x008b8b,
  darkgoldenrod: 0xb8860b,
  darkgray: 0xa9a9a9,
  darkgreen: 0x006400,
  darkgrey: 0xa9a9a9,
  darkkhaki: 0xbdb76b,
  darkmagenta: 0x8b008b,
  darkolivegreen: 0x556b2f,
  darkorange: 0xff8c00,
  darkorchid: 0x9932cc,
  darkred: 0x8b0000,
  darksalmon: 0xe9967a,
  darkseagreen: 0x8fbc8f,
  darkslateblue: 0x483d8b,
  darkslategray: 0x2f4f4f,
  darkslategrey: 0x2f4f4f,
  darkturquoise: 0x00ced1,
  darkviolet: 0x9400d3,
  deeppink: 0xff1493,
  deepskyblue: 0x00bfff,
  dimgray: 0x696969,
  dimgrey: 0x696969,
  dodgerblue: 0x1e90ff,
  firebrick: 0xb22222,
  floralwhite: 0xfffaf0,
  forestgreen: 0x228b22,
  fuchsia: 0xff00ff,
  gainsboro: 0xdcdcdc,
  ghostwhite: 0xf8f8ff,
  gold: 0xffd700,
  goldenrod: 0xdaa520,
  gray: 0x808080,
  green: 0x008000,
  greenyellow: 0xadff2f,
  grey: 0x808080,
  honeydew: 0xf0fff0,
  hotpink: 0xff69b4,
  indianred: 0xcd5c5c,
  indigo: 0x4b0082,
  ivory: 0xfffff0,
  khaki: 0xf0e68c,
  lavender: 0xe6e6fa,
  lavenderblush: 0xfff0f5,
  lawngreen: 0x7cfc00,
  lemonchiffon: 0xfffacd,
  lightblue: 0xadd8e6,
  lightcoral: 0xf08080,
  lightcyan: 0xe0ffff,
  lightgoldenrodyellow: 0xfafad2,
  lightgray: 0xd3d3d3,
  lightgreen: 0x90ee90,
  lightgrey: 0xd3d3d3,
  lightpink: 0xffb6c1,
  lightsalmon: 0xffa07a,
  lightseagreen: 0x20b2aa,
  lightskyblue: 0x87cefa,
  lightslategray: 0x778899,
  lightslategrey: 0x778899,
  lightsteelblue: 0xb0c4de,
  lightyellow: 0xffffe0,
  lime: 0x00ff00,
  limegreen: 0x32cd32,
  linen: 0xfaf0e6,
  magenta: 0xff00ff,
  maroon: 0x800000,
  mediumaquamarine: 0x66cdaa,
  mediumblue: 0x0000cd,
  mediumorchid: 0xba55d3,
  mediumpurple: 0x9370db,
  mediumseagreen: 0x3cb371,
  mediumslateblue: 0x7b68ee,
  mediumspringgreen: 0x00fa9a,
  mediumturquoise: 0x48d1cc,
  mediumvioletred: 0xc71585,
  midnightblue: 0x191970,
  mintcream: 0xf5fffa,
  mistyrose: 0xffe4e1,
  moccasin: 0xffe4b5,
  navajowhite: 0xffdead,
  navy: 0x000080,
  oldlace: 0xfdf5e6,
  olive: 0x808000,
  olivedrab: 0x6b8e23,
  orange: 0xffa500,
  orangered: 0xff4500,
  orchid: 0xda70d6,
  palegoldenrod: 0xeee8aa,
  palegreen: 0x98fb98,
  paleturquoise: 0xafeeee,
  palevioletred: 0xdb7093,
  papayawhip: 0xffefd5,
  peachpuff: 0xffdab9,
  peru: 0xcd853f,
  pink: 0xffc0cb,
  plum: 0xdda0dd,
  powderblue: 0xb0e0e6,
  purple: 0x800080,
  rebeccapurple: 0x663399,
  red: 0xff0000,
  rosybrown: 0xbc8f8f,
  royalblue: 0x4169e1,
  saddlebrown: 0x8b4513,
  salmon: 0xfa8072,
  sandybrown: 0xf4a460,
  seagreen: 0x2e8b57,
  seashell: 0xfff5ee,
  sienna: 0xa0522d,
  silver: 0xc0c0c0,
  skyblue: 0x87ceeb,
  slateblue: 0x6a5acd,
  slategray: 0x708090,
  slategrey: 0x708090,
  snow: 0xfffafa,
  springgreen: 0x00ff7f,
  steelblue: 0x4682b4,
  tan: 0xd2b48c,
  teal: 0x008080,
  thistle: 0xd8bfd8,
  tomato: 0xff6347,
  turquoise: 0x40e0d0,
  violet: 0xee82ee,
  wheat: 0xf5deb3,
  white: 0xffffff,
  whitesmoke: 0xf5f5f5,
  yellow: 0xffff00,
  yellowgreen: 0x9acd32
};

define(Color, color, {
  copy(channels) {
    return Object.assign(new this.constructor, this, channels);
  },
  displayable() {
    return this.rgb().displayable();
  },
  hex: color_formatHex, // Deprecated! Use color.formatHex.
  formatHex: color_formatHex,
  formatHex8: color_formatHex8,
  formatHsl: color_formatHsl,
  formatRgb: color_formatRgb,
  toString: color_formatRgb
});

function color_formatHex() {
  return this.rgb().formatHex();
}

function color_formatHex8() {
  return this.rgb().formatHex8();
}

function color_formatHsl() {
  return hslConvert(this).formatHsl();
}

function color_formatRgb() {
  return this.rgb().formatRgb();
}

function color(format) {
  var m, l;
  format = (format + "").trim().toLowerCase();
  return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) // #ff0000
      : l === 3 ? new Rgb((m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf), 1) // #f00
      : l === 8 ? rgba(m >> 24 & 0xff, m >> 16 & 0xff, m >> 8 & 0xff, (m & 0xff) / 0xff) // #ff000000
      : l === 4 ? rgba((m >> 12 & 0xf) | (m >> 8 & 0xf0), (m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), (((m & 0xf) << 4) | (m & 0xf)) / 0xff) // #f000
      : null) // invalid hex
      : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
      : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
      : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
      : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
      : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
      : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
      : named.hasOwnProperty(format) ? rgbn(named[format]) // eslint-disable-line no-prototype-builtins
      : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0)
      : null;
}

function rgbn(n) {
  return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
}

function rgba(r, g, b, a) {
  if (a <= 0) r = g = b = NaN;
  return new Rgb(r, g, b, a);
}

function rgbConvert(o) {
  if (!(o instanceof Color)) o = color(o);
  if (!o) return new Rgb;
  o = o.rgb();
  return new Rgb(o.r, o.g, o.b, o.opacity);
}

function rgb(r, g, b, opacity) {
  return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
}

function Rgb(r, g, b, opacity) {
  this.r = +r;
  this.g = +g;
  this.b = +b;
  this.opacity = +opacity;
}

define(Rgb, rgb, extend(Color, {
  brighter(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
  },
  darker(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
  },
  rgb() {
    return this;
  },
  clamp() {
    return new Rgb(clampi(this.r), clampi(this.g), clampi(this.b), clampa(this.opacity));
  },
  displayable() {
    return (-0.5 <= this.r && this.r < 255.5)
        && (-0.5 <= this.g && this.g < 255.5)
        && (-0.5 <= this.b && this.b < 255.5)
        && (0 <= this.opacity && this.opacity <= 1);
  },
  hex: rgb_formatHex, // Deprecated! Use color.formatHex.
  formatHex: rgb_formatHex,
  formatHex8: rgb_formatHex8,
  formatRgb: rgb_formatRgb,
  toString: rgb_formatRgb
}));

function rgb_formatHex() {
  return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}`;
}

function rgb_formatHex8() {
  return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}${hex((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
}

function rgb_formatRgb() {
  const a = clampa(this.opacity);
  return `${a === 1 ? "rgb(" : "rgba("}${clampi(this.r)}, ${clampi(this.g)}, ${clampi(this.b)}${a === 1 ? ")" : `, ${a})`}`;
}

function clampa(opacity) {
  return isNaN(opacity) ? 1 : Math.max(0, Math.min(1, opacity));
}

function clampi(value) {
  return Math.max(0, Math.min(255, Math.round(value) || 0));
}

function hex(value) {
  value = clampi(value);
  return (value < 16 ? "0" : "") + value.toString(16);
}

function hsla(h, s, l, a) {
  if (a <= 0) h = s = l = NaN;
  else if (l <= 0 || l >= 1) h = s = NaN;
  else if (s <= 0) h = NaN;
  return new Hsl(h, s, l, a);
}

function hslConvert(o) {
  if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
  if (!(o instanceof Color)) o = color(o);
  if (!o) return new Hsl;
  if (o instanceof Hsl) return o;
  o = o.rgb();
  var r = o.r / 255,
      g = o.g / 255,
      b = o.b / 255,
      min = Math.min(r, g, b),
      max = Math.max(r, g, b),
      h = NaN,
      s = max - min,
      l = (max + min) / 2;
  if (s) {
    if (r === max) h = (g - b) / s + (g < b) * 6;
    else if (g === max) h = (b - r) / s + 2;
    else h = (r - g) / s + 4;
    s /= l < 0.5 ? max + min : 2 - max - min;
    h *= 60;
  } else {
    s = l > 0 && l < 1 ? 0 : h;
  }
  return new Hsl(h, s, l, o.opacity);
}

function hsl(h, s, l, opacity) {
  return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
}

function Hsl(h, s, l, opacity) {
  this.h = +h;
  this.s = +s;
  this.l = +l;
  this.opacity = +opacity;
}

define(Hsl, hsl, extend(Color, {
  brighter(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Hsl(this.h, this.s, this.l * k, this.opacity);
  },
  darker(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Hsl(this.h, this.s, this.l * k, this.opacity);
  },
  rgb() {
    var h = this.h % 360 + (this.h < 0) * 360,
        s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
        l = this.l,
        m2 = l + (l < 0.5 ? l : 1 - l) * s,
        m1 = 2 * l - m2;
    return new Rgb(
      hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
      hsl2rgb(h, m1, m2),
      hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
      this.opacity
    );
  },
  clamp() {
    return new Hsl(clamph(this.h), clampt(this.s), clampt(this.l), clampa(this.opacity));
  },
  displayable() {
    return (0 <= this.s && this.s <= 1 || isNaN(this.s))
        && (0 <= this.l && this.l <= 1)
        && (0 <= this.opacity && this.opacity <= 1);
  },
  formatHsl() {
    const a = clampa(this.opacity);
    return `${a === 1 ? "hsl(" : "hsla("}${clamph(this.h)}, ${clampt(this.s) * 100}%, ${clampt(this.l) * 100}%${a === 1 ? ")" : `, ${a})`}`;
  }
}));

function clamph(value) {
  value = (value || 0) % 360;
  return value < 0 ? value + 360 : value;
}

function clampt(value) {
  return Math.max(0, Math.min(1, value || 0));
}

/* From FvD 13.37, CSS Color Module Level 3 */
function hsl2rgb(h, m1, m2) {
  return (h < 60 ? m1 + (m2 - m1) * h / 60
      : h < 180 ? m2
      : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
      : m1) * 255;
}

const radians = Math.PI / 180;
const degrees$1 = 180 / Math.PI;

// https://observablehq.com/@mbostock/lab-and-rgb
const K = 18,
    Xn = 0.96422,
    Yn = 1,
    Zn = 0.82521,
    t0$1 = 4 / 29,
    t1$1 = 6 / 29,
    t2 = 3 * t1$1 * t1$1,
    t3 = t1$1 * t1$1 * t1$1;

function labConvert(o) {
  if (o instanceof Lab) return new Lab(o.l, o.a, o.b, o.opacity);
  if (o instanceof Hcl) return hcl2lab(o);
  if (!(o instanceof Rgb)) o = rgbConvert(o);
  var r = rgb2lrgb(o.r),
      g = rgb2lrgb(o.g),
      b = rgb2lrgb(o.b),
      y = xyz2lab((0.2225045 * r + 0.7168786 * g + 0.0606169 * b) / Yn), x, z;
  if (r === g && g === b) x = z = y; else {
    x = xyz2lab((0.4360747 * r + 0.3850649 * g + 0.1430804 * b) / Xn);
    z = xyz2lab((0.0139322 * r + 0.0971045 * g + 0.7141733 * b) / Zn);
  }
  return new Lab(116 * y - 16, 500 * (x - y), 200 * (y - z), o.opacity);
}

function lab(l, a, b, opacity) {
  return arguments.length === 1 ? labConvert(l) : new Lab(l, a, b, opacity == null ? 1 : opacity);
}

function Lab(l, a, b, opacity) {
  this.l = +l;
  this.a = +a;
  this.b = +b;
  this.opacity = +opacity;
}

define(Lab, lab, extend(Color, {
  brighter(k) {
    return new Lab(this.l + K * (k == null ? 1 : k), this.a, this.b, this.opacity);
  },
  darker(k) {
    return new Lab(this.l - K * (k == null ? 1 : k), this.a, this.b, this.opacity);
  },
  rgb() {
    var y = (this.l + 16) / 116,
        x = isNaN(this.a) ? y : y + this.a / 500,
        z = isNaN(this.b) ? y : y - this.b / 200;
    x = Xn * lab2xyz(x);
    y = Yn * lab2xyz(y);
    z = Zn * lab2xyz(z);
    return new Rgb(
      lrgb2rgb( 3.1338561 * x - 1.6168667 * y - 0.4906146 * z),
      lrgb2rgb(-0.9787684 * x + 1.9161415 * y + 0.0334540 * z),
      lrgb2rgb( 0.0719453 * x - 0.2289914 * y + 1.4052427 * z),
      this.opacity
    );
  }
}));

function xyz2lab(t) {
  return t > t3 ? Math.pow(t, 1 / 3) : t / t2 + t0$1;
}

function lab2xyz(t) {
  return t > t1$1 ? t * t * t : t2 * (t - t0$1);
}

function lrgb2rgb(x) {
  return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
}

function rgb2lrgb(x) {
  return (x /= 255) <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function hclConvert(o) {
  if (o instanceof Hcl) return new Hcl(o.h, o.c, o.l, o.opacity);
  if (!(o instanceof Lab)) o = labConvert(o);
  if (o.a === 0 && o.b === 0) return new Hcl(NaN, 0 < o.l && o.l < 100 ? 0 : NaN, o.l, o.opacity);
  var h = Math.atan2(o.b, o.a) * degrees$1;
  return new Hcl(h < 0 ? h + 360 : h, Math.sqrt(o.a * o.a + o.b * o.b), o.l, o.opacity);
}

function hcl(h, c, l, opacity) {
  return arguments.length === 1 ? hclConvert(h) : new Hcl(h, c, l, opacity == null ? 1 : opacity);
}

function Hcl(h, c, l, opacity) {
  this.h = +h;
  this.c = +c;
  this.l = +l;
  this.opacity = +opacity;
}

function hcl2lab(o) {
  if (isNaN(o.h)) return new Lab(o.l, 0, 0, o.opacity);
  var h = o.h * radians;
  return new Lab(o.l, Math.cos(h) * o.c, Math.sin(h) * o.c, o.opacity);
}

define(Hcl, hcl, extend(Color, {
  brighter(k) {
    return new Hcl(this.h, this.c, this.l + K * (k == null ? 1 : k), this.opacity);
  },
  darker(k) {
    return new Hcl(this.h, this.c, this.l - K * (k == null ? 1 : k), this.opacity);
  },
  rgb() {
    return hcl2lab(this).rgb();
  }
}));

var A = -0.14861,
    B = +1.78277,
    C = -0.29227,
    D = -0.90649,
    E = +1.97294,
    ED = E * D,
    EB = E * B,
    BC_DA = B * C - D * A;

function cubehelixConvert(o) {
  if (o instanceof Cubehelix) return new Cubehelix(o.h, o.s, o.l, o.opacity);
  if (!(o instanceof Rgb)) o = rgbConvert(o);
  var r = o.r / 255,
      g = o.g / 255,
      b = o.b / 255,
      l = (BC_DA * b + ED * r - EB * g) / (BC_DA + ED - EB),
      bl = b - l,
      k = (E * (g - l) - C * bl) / D,
      s = Math.sqrt(k * k + bl * bl) / (E * l * (1 - l)), // NaN if l=0 or l=1
      h = s ? Math.atan2(k, bl) * degrees$1 - 120 : NaN;
  return new Cubehelix(h < 0 ? h + 360 : h, s, l, o.opacity);
}

function cubehelix$1(h, s, l, opacity) {
  return arguments.length === 1 ? cubehelixConvert(h) : new Cubehelix(h, s, l, opacity == null ? 1 : opacity);
}

function Cubehelix(h, s, l, opacity) {
  this.h = +h;
  this.s = +s;
  this.l = +l;
  this.opacity = +opacity;
}

define(Cubehelix, cubehelix$1, extend(Color, {
  brighter(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
  },
  darker(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
  },
  rgb() {
    var h = isNaN(this.h) ? 0 : (this.h + 120) * radians,
        l = +this.l,
        a = isNaN(this.s) ? 0 : this.s * l * (1 - l),
        cosh = Math.cos(h),
        sinh = Math.sin(h);
    return new Rgb(
      255 * (l + a * (A * cosh + B * sinh)),
      255 * (l + a * (C * cosh + D * sinh)),
      255 * (l + a * (E * cosh)),
      this.opacity
    );
  }
}));

var constant$1 = x => () => x;

function linear$1(a, d) {
  return function(t) {
    return a + t * d;
  };
}

function exponential(a, b, y) {
  return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
    return Math.pow(a + t * b, y);
  };
}

function hue(a, b) {
  var d = b - a;
  return d ? linear$1(a, d > 180 || d < -180 ? d - 360 * Math.round(d / 360) : d) : constant$1(isNaN(a) ? b : a);
}

function gamma(y) {
  return (y = +y) === 1 ? nogamma : function(a, b) {
    return b - a ? exponential(a, b, y) : constant$1(isNaN(a) ? b : a);
  };
}

function nogamma(a, b) {
  var d = b - a;
  return d ? linear$1(a, d) : constant$1(isNaN(a) ? b : a);
}

var interpolateRgb = (function rgbGamma(y) {
  var color = gamma(y);

  function rgb$1(start, end) {
    var r = color((start = rgb(start)).r, (end = rgb(end)).r),
        g = color(start.g, end.g),
        b = color(start.b, end.b),
        opacity = nogamma(start.opacity, end.opacity);
    return function(t) {
      start.r = r(t);
      start.g = g(t);
      start.b = b(t);
      start.opacity = opacity(t);
      return start + "";
    };
  }

  rgb$1.gamma = rgbGamma;

  return rgb$1;
})(1);

function numberArray(a, b) {
  if (!b) b = [];
  var n = a ? Math.min(b.length, a.length) : 0,
      c = b.slice(),
      i;
  return function(t) {
    for (i = 0; i < n; ++i) c[i] = a[i] * (1 - t) + b[i] * t;
    return c;
  };
}

function isNumberArray(x) {
  return ArrayBuffer.isView(x) && !(x instanceof DataView);
}

function genericArray(a, b) {
  var nb = b ? b.length : 0,
      na = a ? Math.min(nb, a.length) : 0,
      x = new Array(na),
      c = new Array(nb),
      i;

  for (i = 0; i < na; ++i) x[i] = interpolate$1(a[i], b[i]);
  for (; i < nb; ++i) c[i] = b[i];

  return function(t) {
    for (i = 0; i < na; ++i) c[i] = x[i](t);
    return c;
  };
}

function date(a, b) {
  var d = new Date;
  return a = +a, b = +b, function(t) {
    return d.setTime(a * (1 - t) + b * t), d;
  };
}

function interpolateNumber(a, b) {
  return a = +a, b = +b, function(t) {
    return a * (1 - t) + b * t;
  };
}

function object(a, b) {
  var i = {},
      c = {},
      k;

  if (a === null || typeof a !== "object") a = {};
  if (b === null || typeof b !== "object") b = {};

  for (k in b) {
    if (k in a) {
      i[k] = interpolate$1(a[k], b[k]);
    } else {
      c[k] = b[k];
    }
  }

  return function(t) {
    for (k in i) c[k] = i[k](t);
    return c;
  };
}

var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,
    reB = new RegExp(reA.source, "g");

function zero$1(b) {
  return function() {
    return b;
  };
}

function one(b) {
  return function(t) {
    return b(t) + "";
  };
}

function interpolateString(a, b) {
  var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
      am, // current match in a
      bm, // current match in b
      bs, // string preceding current number in b, if any
      i = -1, // index in s
      s = [], // string constants and placeholders
      q = []; // number interpolators

  // Coerce inputs to strings.
  a = a + "", b = b + "";

  // Interpolate pairs of numbers in a & b.
  while ((am = reA.exec(a))
      && (bm = reB.exec(b))) {
    if ((bs = bm.index) > bi) { // a string precedes the next number in b
      bs = b.slice(bi, bs);
      if (s[i]) s[i] += bs; // coalesce with previous string
      else s[++i] = bs;
    }
    if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
      if (s[i]) s[i] += bm; // coalesce with previous string
      else s[++i] = bm;
    } else { // interpolate non-matching numbers
      s[++i] = null;
      q.push({i: i, x: interpolateNumber(am, bm)});
    }
    bi = reB.lastIndex;
  }

  // Add remains of b.
  if (bi < b.length) {
    bs = b.slice(bi);
    if (s[i]) s[i] += bs; // coalesce with previous string
    else s[++i] = bs;
  }

  // Special optimization for only a single match.
  // Otherwise, interpolate each of the numbers and rejoin the string.
  return s.length < 2 ? (q[0]
      ? one(q[0].x)
      : zero$1(b))
      : (b = q.length, function(t) {
          for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
          return s.join("");
        });
}

function interpolate$1(a, b) {
  var t = typeof b, c;
  return b == null || t === "boolean" ? constant$1(b)
      : (t === "number" ? interpolateNumber
      : t === "string" ? ((c = color(b)) ? (b = c, interpolateRgb) : interpolateString)
      : b instanceof color ? interpolateRgb
      : b instanceof Date ? date
      : isNumberArray(b) ? numberArray
      : Array.isArray(b) ? genericArray
      : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object
      : interpolateNumber)(a, b);
}

function interpolateRound(a, b) {
  return a = +a, b = +b, function(t) {
    return Math.round(a * (1 - t) + b * t);
  };
}

var degrees = 180 / Math.PI;

var identity$3 = {
  translateX: 0,
  translateY: 0,
  rotate: 0,
  skewX: 0,
  scaleX: 1,
  scaleY: 1
};

function decompose(a, b, c, d, e, f) {
  var scaleX, scaleY, skewX;
  if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
  if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
  if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
  if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
  return {
    translateX: e,
    translateY: f,
    rotate: Math.atan2(b, a) * degrees,
    skewX: Math.atan(skewX) * degrees,
    scaleX: scaleX,
    scaleY: scaleY
  };
}

var svgNode;

/* eslint-disable no-undef */
function parseCss(value) {
  const m = new (typeof DOMMatrix === "function" ? DOMMatrix : WebKitCSSMatrix)(value + "");
  return m.isIdentity ? identity$3 : decompose(m.a, m.b, m.c, m.d, m.e, m.f);
}

function parseSvg(value) {
  if (value == null) return identity$3;
  if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
  svgNode.setAttribute("transform", value);
  if (!(value = svgNode.transform.baseVal.consolidate())) return identity$3;
  value = value.matrix;
  return decompose(value.a, value.b, value.c, value.d, value.e, value.f);
}

function interpolateTransform(parse, pxComma, pxParen, degParen) {

  function pop(s) {
    return s.length ? s.pop() + " " : "";
  }

  function translate(xa, ya, xb, yb, s, q) {
    if (xa !== xb || ya !== yb) {
      var i = s.push("translate(", null, pxComma, null, pxParen);
      q.push({i: i - 4, x: interpolateNumber(xa, xb)}, {i: i - 2, x: interpolateNumber(ya, yb)});
    } else if (xb || yb) {
      s.push("translate(" + xb + pxComma + yb + pxParen);
    }
  }

  function rotate(a, b, s, q) {
    if (a !== b) {
      if (a - b > 180) b += 360; else if (b - a > 180) a += 360; // shortest path
      q.push({i: s.push(pop(s) + "rotate(", null, degParen) - 2, x: interpolateNumber(a, b)});
    } else if (b) {
      s.push(pop(s) + "rotate(" + b + degParen);
    }
  }

  function skewX(a, b, s, q) {
    if (a !== b) {
      q.push({i: s.push(pop(s) + "skewX(", null, degParen) - 2, x: interpolateNumber(a, b)});
    } else if (b) {
      s.push(pop(s) + "skewX(" + b + degParen);
    }
  }

  function scale(xa, ya, xb, yb, s, q) {
    if (xa !== xb || ya !== yb) {
      var i = s.push(pop(s) + "scale(", null, ",", null, ")");
      q.push({i: i - 4, x: interpolateNumber(xa, xb)}, {i: i - 2, x: interpolateNumber(ya, yb)});
    } else if (xb !== 1 || yb !== 1) {
      s.push(pop(s) + "scale(" + xb + "," + yb + ")");
    }
  }

  return function(a, b) {
    var s = [], // string constants and placeholders
        q = []; // number interpolators
    a = parse(a), b = parse(b);
    translate(a.translateX, a.translateY, b.translateX, b.translateY, s, q);
    rotate(a.rotate, b.rotate, s, q);
    skewX(a.skewX, b.skewX, s, q);
    scale(a.scaleX, a.scaleY, b.scaleX, b.scaleY, s, q);
    a = b = null; // gc
    return function(t) {
      var i = -1, n = q.length, o;
      while (++i < n) s[(o = q[i]).i] = o.x(t);
      return s.join("");
    };
  };
}

var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

var epsilon2 = 1e-12;

function cosh(x) {
  return ((x = Math.exp(x)) + 1 / x) / 2;
}

function sinh(x) {
  return ((x = Math.exp(x)) - 1 / x) / 2;
}

function tanh(x) {
  return ((x = Math.exp(2 * x)) - 1) / (x + 1);
}

((function zoomRho(rho, rho2, rho4) {

  // p0 = [ux0, uy0, w0]
  // p1 = [ux1, uy1, w1]
  function zoom(p0, p1) {
    var ux0 = p0[0], uy0 = p0[1], w0 = p0[2],
        ux1 = p1[0], uy1 = p1[1], w1 = p1[2],
        dx = ux1 - ux0,
        dy = uy1 - uy0,
        d2 = dx * dx + dy * dy,
        i,
        S;

    // Special case for u0 ≅ u1.
    if (d2 < epsilon2) {
      S = Math.log(w1 / w0) / rho;
      i = function(t) {
        return [
          ux0 + t * dx,
          uy0 + t * dy,
          w0 * Math.exp(rho * t * S)
        ];
      };
    }

    // General case.
    else {
      var d1 = Math.sqrt(d2),
          b0 = (w1 * w1 - w0 * w0 + rho4 * d2) / (2 * w0 * rho2 * d1),
          b1 = (w1 * w1 - w0 * w0 - rho4 * d2) / (2 * w1 * rho2 * d1),
          r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0),
          r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
      S = (r1 - r0) / rho;
      i = function(t) {
        var s = t * S,
            coshr0 = cosh(r0),
            u = w0 / (rho2 * d1) * (coshr0 * tanh(rho * s + r0) - sinh(r0));
        return [
          ux0 + u * dx,
          uy0 + u * dy,
          w0 * coshr0 / cosh(rho * s + r0)
        ];
      };
    }

    i.duration = S * 1000 * rho / Math.SQRT2;

    return i;
  }

  zoom.rho = function(_) {
    var _1 = Math.max(1e-3, +_), _2 = _1 * _1, _4 = _2 * _2;
    return zoomRho(_1, _2, _4);
  };

  return zoom;
}))(Math.SQRT2, 2, 4);

function cubehelix(hue) {
  return (function cubehelixGamma(y) {
    y = +y;

    function cubehelix(start, end) {
      var h = hue((start = cubehelix$1(start)).h, (end = cubehelix$1(end)).h),
          s = nogamma(start.s, end.s),
          l = nogamma(start.l, end.l),
          opacity = nogamma(start.opacity, end.opacity);
      return function(t) {
        start.h = h(t);
        start.s = s(t);
        start.l = l(Math.pow(t, y));
        start.opacity = opacity(t);
        return start + "";
      };
    }

    cubehelix.gamma = cubehelixGamma;

    return cubehelix;
  })(1);
}

cubehelix(hue);
cubehelix(nogamma);

function tweenRemove(id, name) {
  var tween0, tween1;
  return function() {
    var schedule = set(this, id),
        tween = schedule.tween;

    // If this node shared tween with the previous node,
    // just assign the updated shared tween and we’re done!
    // Otherwise, copy-on-write.
    if (tween !== tween0) {
      tween1 = tween0 = tween;
      for (var i = 0, n = tween1.length; i < n; ++i) {
        if (tween1[i].name === name) {
          tween1 = tween1.slice();
          tween1.splice(i, 1);
          break;
        }
      }
    }

    schedule.tween = tween1;
  };
}

function tweenFunction(id, name, value) {
  var tween0, tween1;
  if (typeof value !== "function") throw new Error;
  return function() {
    var schedule = set(this, id),
        tween = schedule.tween;

    // If this node shared tween with the previous node,
    // just assign the updated shared tween and we’re done!
    // Otherwise, copy-on-write.
    if (tween !== tween0) {
      tween1 = (tween0 = tween).slice();
      for (var t = {name: name, value: value}, i = 0, n = tween1.length; i < n; ++i) {
        if (tween1[i].name === name) {
          tween1[i] = t;
          break;
        }
      }
      if (i === n) tween1.push(t);
    }

    schedule.tween = tween1;
  };
}

function transition_tween(name, value) {
  var id = this._id;

  name += "";

  if (arguments.length < 2) {
    var tween = get(this.node(), id).tween;
    for (var i = 0, n = tween.length, t; i < n; ++i) {
      if ((t = tween[i]).name === name) {
        return t.value;
      }
    }
    return null;
  }

  return this.each((value == null ? tweenRemove : tweenFunction)(id, name, value));
}

function tweenValue(transition, name, value) {
  var id = transition._id;

  transition.each(function() {
    var schedule = set(this, id);
    (schedule.value || (schedule.value = {}))[name] = value.apply(this, arguments);
  });

  return function(node) {
    return get(node, id).value[name];
  };
}

function interpolate(a, b) {
  var c;
  return (typeof b === "number" ? interpolateNumber
      : b instanceof color ? interpolateRgb
      : (c = color(b)) ? (b = c, interpolateRgb)
      : interpolateString)(a, b);
}

function attrRemove(name) {
  return function() {
    this.removeAttribute(name);
  };
}

function attrRemoveNS(fullname) {
  return function() {
    this.removeAttributeNS(fullname.space, fullname.local);
  };
}

function attrConstant(name, interpolate, value1) {
  var string00,
      string1 = value1 + "",
      interpolate0;
  return function() {
    var string0 = this.getAttribute(name);
    return string0 === string1 ? null
        : string0 === string00 ? interpolate0
        : interpolate0 = interpolate(string00 = string0, value1);
  };
}

function attrConstantNS(fullname, interpolate, value1) {
  var string00,
      string1 = value1 + "",
      interpolate0;
  return function() {
    var string0 = this.getAttributeNS(fullname.space, fullname.local);
    return string0 === string1 ? null
        : string0 === string00 ? interpolate0
        : interpolate0 = interpolate(string00 = string0, value1);
  };
}

function attrFunction(name, interpolate, value) {
  var string00,
      string10,
      interpolate0;
  return function() {
    var string0, value1 = value(this), string1;
    if (value1 == null) return void this.removeAttribute(name);
    string0 = this.getAttribute(name);
    string1 = value1 + "";
    return string0 === string1 ? null
        : string0 === string00 && string1 === string10 ? interpolate0
        : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
  };
}

function attrFunctionNS(fullname, interpolate, value) {
  var string00,
      string10,
      interpolate0;
  return function() {
    var string0, value1 = value(this), string1;
    if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
    string0 = this.getAttributeNS(fullname.space, fullname.local);
    string1 = value1 + "";
    return string0 === string1 ? null
        : string0 === string00 && string1 === string10 ? interpolate0
        : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
  };
}

function transition_attr(name, value) {
  var fullname = namespace(name), i = fullname === "transform" ? interpolateTransformSvg : interpolate;
  return this.attrTween(name, typeof value === "function"
      ? (fullname.local ? attrFunctionNS : attrFunction)(fullname, i, tweenValue(this, "attr." + name, value))
      : value == null ? (fullname.local ? attrRemoveNS : attrRemove)(fullname)
      : (fullname.local ? attrConstantNS : attrConstant)(fullname, i, value));
}

function attrInterpolate(name, i) {
  return function(t) {
    this.setAttribute(name, i.call(this, t));
  };
}

function attrInterpolateNS(fullname, i) {
  return function(t) {
    this.setAttributeNS(fullname.space, fullname.local, i.call(this, t));
  };
}

function attrTweenNS(fullname, value) {
  var t0, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t0 = (i0 = i) && attrInterpolateNS(fullname, i);
    return t0;
  }
  tween._value = value;
  return tween;
}

function attrTween(name, value) {
  var t0, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t0 = (i0 = i) && attrInterpolate(name, i);
    return t0;
  }
  tween._value = value;
  return tween;
}

function transition_attrTween(name, value) {
  var key = "attr." + name;
  if (arguments.length < 2) return (key = this.tween(key)) && key._value;
  if (value == null) return this.tween(key, null);
  if (typeof value !== "function") throw new Error;
  var fullname = namespace(name);
  return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
}

function delayFunction(id, value) {
  return function() {
    init(this, id).delay = +value.apply(this, arguments);
  };
}

function delayConstant(id, value) {
  return value = +value, function() {
    init(this, id).delay = value;
  };
}

function transition_delay(value) {
  var id = this._id;

  return arguments.length
      ? this.each((typeof value === "function"
          ? delayFunction
          : delayConstant)(id, value))
      : get(this.node(), id).delay;
}

function durationFunction(id, value) {
  return function() {
    set(this, id).duration = +value.apply(this, arguments);
  };
}

function durationConstant(id, value) {
  return value = +value, function() {
    set(this, id).duration = value;
  };
}

function transition_duration(value) {
  var id = this._id;

  return arguments.length
      ? this.each((typeof value === "function"
          ? durationFunction
          : durationConstant)(id, value))
      : get(this.node(), id).duration;
}

function easeConstant(id, value) {
  if (typeof value !== "function") throw new Error;
  return function() {
    set(this, id).ease = value;
  };
}

function transition_ease(value) {
  var id = this._id;

  return arguments.length
      ? this.each(easeConstant(id, value))
      : get(this.node(), id).ease;
}

function easeVarying(id, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (typeof v !== "function") throw new Error;
    set(this, id).ease = v;
  };
}

function transition_easeVarying(value) {
  if (typeof value !== "function") throw new Error;
  return this.each(easeVarying(this._id, value));
}

function transition_filter(match) {
  if (typeof match !== "function") match = matcher(match);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
        subgroup.push(node);
      }
    }
  }

  return new Transition(subgroups, this._parents, this._name, this._id);
}

function transition_merge(transition) {
  if (transition._id !== this._id) throw new Error;

  for (var groups0 = this._groups, groups1 = transition._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
    for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group0[i] || group1[i]) {
        merge[i] = node;
      }
    }
  }

  for (; j < m0; ++j) {
    merges[j] = groups0[j];
  }

  return new Transition(merges, this._parents, this._name, this._id);
}

function start(name) {
  return (name + "").trim().split(/^|\s+/).every(function(t) {
    var i = t.indexOf(".");
    if (i >= 0) t = t.slice(0, i);
    return !t || t === "start";
  });
}

function onFunction(id, name, listener) {
  var on0, on1, sit = start(name) ? init : set;
  return function() {
    var schedule = sit(this, id),
        on = schedule.on;

    // If this node shared a dispatch with the previous node,
    // just assign the updated shared dispatch and we’re done!
    // Otherwise, copy-on-write.
    if (on !== on0) (on1 = (on0 = on).copy()).on(name, listener);

    schedule.on = on1;
  };
}

function transition_on(name, listener) {
  var id = this._id;

  return arguments.length < 2
      ? get(this.node(), id).on.on(name)
      : this.each(onFunction(id, name, listener));
}

function removeFunction(id) {
  return function() {
    var parent = this.parentNode;
    for (var i in this.__transition) if (+i !== id) return;
    if (parent) parent.removeChild(this);
  };
}

function transition_remove() {
  return this.on("end.remove", removeFunction(this._id));
}

function transition_select(select) {
  var name = this._name,
      id = this._id;

  if (typeof select !== "function") select = selector(select);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
      if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
        if ("__data__" in node) subnode.__data__ = node.__data__;
        subgroup[i] = subnode;
        schedule(subgroup[i], name, id, i, subgroup, get(node, id));
      }
    }
  }

  return new Transition(subgroups, this._parents, name, id);
}

function transition_selectAll(select) {
  var name = this._name,
      id = this._id;

  if (typeof select !== "function") select = selectorAll(select);

  for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        for (var children = select.call(node, node.__data__, i, group), child, inherit = get(node, id), k = 0, l = children.length; k < l; ++k) {
          if (child = children[k]) {
            schedule(child, name, id, k, children, inherit);
          }
        }
        subgroups.push(children);
        parents.push(node);
      }
    }
  }

  return new Transition(subgroups, parents, name, id);
}

var Selection = selection.prototype.constructor;

function transition_selection() {
  return new Selection(this._groups, this._parents);
}

function styleNull(name, interpolate) {
  var string00,
      string10,
      interpolate0;
  return function() {
    var string0 = styleValue(this, name),
        string1 = (this.style.removeProperty(name), styleValue(this, name));
    return string0 === string1 ? null
        : string0 === string00 && string1 === string10 ? interpolate0
        : interpolate0 = interpolate(string00 = string0, string10 = string1);
  };
}

function styleRemove(name) {
  return function() {
    this.style.removeProperty(name);
  };
}

function styleConstant(name, interpolate, value1) {
  var string00,
      string1 = value1 + "",
      interpolate0;
  return function() {
    var string0 = styleValue(this, name);
    return string0 === string1 ? null
        : string0 === string00 ? interpolate0
        : interpolate0 = interpolate(string00 = string0, value1);
  };
}

function styleFunction(name, interpolate, value) {
  var string00,
      string10,
      interpolate0;
  return function() {
    var string0 = styleValue(this, name),
        value1 = value(this),
        string1 = value1 + "";
    if (value1 == null) string1 = value1 = (this.style.removeProperty(name), styleValue(this, name));
    return string0 === string1 ? null
        : string0 === string00 && string1 === string10 ? interpolate0
        : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
  };
}

function styleMaybeRemove(id, name) {
  var on0, on1, listener0, key = "style." + name, event = "end." + key, remove;
  return function() {
    var schedule = set(this, id),
        on = schedule.on,
        listener = schedule.value[key] == null ? remove || (remove = styleRemove(name)) : undefined;

    // If this node shared a dispatch with the previous node,
    // just assign the updated shared dispatch and we’re done!
    // Otherwise, copy-on-write.
    if (on !== on0 || listener0 !== listener) (on1 = (on0 = on).copy()).on(event, listener0 = listener);

    schedule.on = on1;
  };
}

function transition_style(name, value, priority) {
  var i = (name += "") === "transform" ? interpolateTransformCss : interpolate;
  return value == null ? this
      .styleTween(name, styleNull(name, i))
      .on("end.style." + name, styleRemove(name))
    : typeof value === "function" ? this
      .styleTween(name, styleFunction(name, i, tweenValue(this, "style." + name, value)))
      .each(styleMaybeRemove(this._id, name))
    : this
      .styleTween(name, styleConstant(name, i, value), priority)
      .on("end.style." + name, null);
}

function styleInterpolate(name, i, priority) {
  return function(t) {
    this.style.setProperty(name, i.call(this, t), priority);
  };
}

function styleTween(name, value, priority) {
  var t, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t = (i0 = i) && styleInterpolate(name, i, priority);
    return t;
  }
  tween._value = value;
  return tween;
}

function transition_styleTween(name, value, priority) {
  var key = "style." + (name += "");
  if (arguments.length < 2) return (key = this.tween(key)) && key._value;
  if (value == null) return this.tween(key, null);
  if (typeof value !== "function") throw new Error;
  return this.tween(key, styleTween(name, value, priority == null ? "" : priority));
}

function textConstant(value) {
  return function() {
    this.textContent = value;
  };
}

function textFunction(value) {
  return function() {
    var value1 = value(this);
    this.textContent = value1 == null ? "" : value1;
  };
}

function transition_text(value) {
  return this.tween("text", typeof value === "function"
      ? textFunction(tweenValue(this, "text", value))
      : textConstant(value == null ? "" : value + ""));
}

function textInterpolate(i) {
  return function(t) {
    this.textContent = i.call(this, t);
  };
}

function textTween(value) {
  var t0, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t0 = (i0 = i) && textInterpolate(i);
    return t0;
  }
  tween._value = value;
  return tween;
}

function transition_textTween(value) {
  var key = "text";
  if (arguments.length < 1) return (key = this.tween(key)) && key._value;
  if (value == null) return this.tween(key, null);
  if (typeof value !== "function") throw new Error;
  return this.tween(key, textTween(value));
}

function transition_transition() {
  var name = this._name,
      id0 = this._id,
      id1 = newId();

  for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        var inherit = get(node, id0);
        schedule(node, name, id1, i, group, {
          time: inherit.time + inherit.delay + inherit.duration,
          delay: 0,
          duration: inherit.duration,
          ease: inherit.ease
        });
      }
    }
  }

  return new Transition(groups, this._parents, name, id1);
}

function transition_end() {
  var on0, on1, that = this, id = that._id, size = that.size();
  return new Promise(function(resolve, reject) {
    var cancel = {value: reject},
        end = {value: function() { if (--size === 0) resolve(); }};

    that.each(function() {
      var schedule = set(this, id),
          on = schedule.on;

      // If this node shared a dispatch with the previous node,
      // just assign the updated shared dispatch and we’re done!
      // Otherwise, copy-on-write.
      if (on !== on0) {
        on1 = (on0 = on).copy();
        on1._.cancel.push(cancel);
        on1._.interrupt.push(cancel);
        on1._.end.push(end);
      }

      schedule.on = on1;
    });

    // The selection was empty, resolve end immediately
    if (size === 0) resolve();
  });
}

var id = 0;

function Transition(groups, parents, name, id) {
  this._groups = groups;
  this._parents = parents;
  this._name = name;
  this._id = id;
}

function newId() {
  return ++id;
}

var selection_prototype = selection.prototype;

Transition.prototype = {
  constructor: Transition,
  select: transition_select,
  selectAll: transition_selectAll,
  selectChild: selection_prototype.selectChild,
  selectChildren: selection_prototype.selectChildren,
  filter: transition_filter,
  merge: transition_merge,
  selection: transition_selection,
  transition: transition_transition,
  call: selection_prototype.call,
  nodes: selection_prototype.nodes,
  node: selection_prototype.node,
  size: selection_prototype.size,
  empty: selection_prototype.empty,
  each: selection_prototype.each,
  on: transition_on,
  attr: transition_attr,
  attrTween: transition_attrTween,
  style: transition_style,
  styleTween: transition_styleTween,
  text: transition_text,
  textTween: transition_textTween,
  remove: transition_remove,
  tween: transition_tween,
  delay: transition_delay,
  duration: transition_duration,
  ease: transition_ease,
  easeVarying: transition_easeVarying,
  end: transition_end,
  [Symbol.iterator]: selection_prototype[Symbol.iterator]
};

var defaultTiming = {
  time: null, // Set on use.
  delay: 0,
  duration: 250,
  ease: cubicInOut
};

function inherit(node, id) {
  var timing;
  while (!(timing = node.__transition) || !(timing = timing[id])) {
    if (!(node = node.parentNode)) {
      throw new Error(`transition ${id} not found`);
    }
  }
  return timing;
}

function selection_transition(name) {
  var id,
      timing;

  if (name instanceof Transition) {
    id = name._id, name = name._name;
  } else {
    id = newId(), (timing = defaultTiming).time = now(), name = name == null ? null : name + "";
  }

  for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        schedule(node, name, id, i, group, timing || inherit(node, id));
      }
    }
  }

  return new Transition(groups, this._parents, name, id);
}

selection.prototype.interrupt = selection_interrupt;
selection.prototype.transition = selection_transition;

function getArrowBottomCursor() {
    return '<?xml version="1.0" encoding="UTF-8"?>\r\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 5"><path fill="white" stroke="black" stroke-width="0.5" d="M 1 0 L 7 0 L 4 5 z"/></svg>';
}
function getArrowBottom() {
    return '<?xml version="1.0" encoding="UTF-8"?>\r\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 5"><path fill="rgb(242, 242, 76)" fill-opacity="0.5" stroke="black" stroke-width="0.2" d="M 0 0 L 6 0 L 3 5 z"/></svg>';
}
function getArrowBottomActive() {
    return '<?xml version="1.0" encoding="UTF-8"?>\r\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 5"><path fill="rgb(255, 255, 0)" fill-opacity="0.7" stroke="black" stroke-width="0.5" d="M 0 0 L 6 0 L 3 5 z"/></svg>';
}
function getArrowDown() {
    return '<?xml version="1.0" encoding="UTF-8"?>\r\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 10"><path d="M 0 6 L 2 6 L 2 0 L 4 0 L 4 6 L 6 6 L 3 10 z"/></svg>';
}
function getArrowDownCursor() {
    return '<?xml version="1.0" encoding="UTF-8"?>\r\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3.9687499 3.96875"><path fill="white" stroke="black" stroke-width="0.318611" d="m 1.1578161,0.21695335 c -0.061702,-0.0329161 -0.81488983,-0.0133494 -0.81488983,-0.0133494 0,0 0.54265514,0.55608717 0.93827003,0.96284295 0.4433991,0.4558857 0.4777944,0.8151048 0.4777944,0.8151048 H 0.5130859 l 1.6505985,1.7274342 1.434036,-1.7247007 c -0.534692,-0.00674 -0.7326378,0.00633 -1.0334189,0.013349 0,0 -0.1208928,-1.09485632 -1.4064854,-1.78068085 z"/></svg>';
}
function getArrowLeftAndRight() {
    return '<?xml version="1.0" encoding="UTF-8"?>\r\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 6"><path fill="white" stroke="black" stroke-width="1" d="M 0 3 L 3 0 L 3 2 L 7 2 L 7 0 L 10 3 L 7 6 L 7 4 L 3 4 L 3 6 z"/></svg>';
}
function getArrowLeft() {
    return '<?xml version="1.0" encoding="UTF-8"?>\r\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 6"><path fill="white" stroke="black" stroke-width="1" d="M 0 2 L 6 2 L 6 0 L 10 3 L 6 6 L 6 4 L 0 4 z"/></svg>';
}
function getArrowRight() {
    return '<?xml version="1.0" encoding="UTF-8"?>\r\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 6"><path fill="white" stroke="black" stroke-width="1" d="M 0 3 L 4 0 L 4 2 L 10 2 L 10 4 L 4 4 L 4 6 z"/></svg>';
}
function getArrowTopAndBottom() {
    return '<?xml version="1.0" encoding="UTF-8"?>\r\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 12"><path fill="white" stroke="black" stroke-width="0.5" d="M 0 5.5 L 3 1 L 6 5.5 z"/><path fill="white" stroke="black" stroke-width="0.5" d="M 0 6.5 L 3 11 L 6 6.5 z"/></svg>';
}
function getArrowTopCursor() {
    return '<?xml version="1.0" encoding="UTF-8"?>\r\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 5"><path fill="white" stroke="black" stroke-width="0.5" d="M 1 5 L 4 0 L 7 5 z"/></svg>';
}
function getArrowTop() {
    return '<?xml version="1.0" encoding="UTF-8"?>\r\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 5"><path fill="rgb(242, 242, 76)" fill-opacity="0.5" stroke="black" stroke-width="0.2" d="M 0 5 L 3 0 L 6 5 z"/></svg>';
}
function getArrowTopActive() {
    return '<?xml version="1.0" encoding="UTF-8"?>\r\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 5"><path fill="rgb(255, 255, 0)" fill-opacity="0.7" stroke="black" stroke-width="0.5" d="M 0 5 L 3 0 L 6 5 z"/></svg>';
}
function getArrowUp() {
    return '<?xml version="1.0" encoding="UTF-8"?>\r\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 10"><path d="M 0 4 L 3 0 L 6 4 L 4 4 L 4 10 L 2 10 L 2 4 z"/></svg>';
}
function getArrowUpCursor() {
    return '<?xml version="1.0" encoding="UTF-8"?>\r\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3.9687499 3.96875"><path fill="white" stroke="black" stroke-width="0.318611" d="m 2.7893699,3.7809852 c 0.061702,0.032916 0.8148899,0.013349 0.8148899,0.013349 0,0 -0.5426551,-0.5560871 -0.9382701,-0.9628429 C 2.2225906,2.375606 2.1881953,2.0163869 2.1881953,2.0163869 H 3.4341002 L 1.7835016,0.28895256 0.34946563,2.0136534 c 0.534692,0.00674 0.73263777,-0.00633 1.03341887,-0.013349 0,0 0.1208928,1.0948563 1.4064854,1.7806808 z"/></svg>';
}
function getRefreshIcon() {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><polyline points="6.5 4 8.5 4 8.5 2" fill="none" stroke="black" stroke-width="0.75"/><path d="M8.5 4 L 7 2.5 A 3 3 0 0 0 2.5 2.5" fill="none" stroke="black" stroke-width="0.5"/><polyline points="3.5 6 1.5 6 1.5 8" fill="none" stroke="black" stroke-width="0.5"/><path d="M1.5 6 L 2.5 7 A 3 3 0 0 0 7 7" fill="none" stroke="black" stroke-width="0.5"/></svg>';
}
function getTableIcon() {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" rx="1" ry="1" stroke="black" stroke-width="0.5" fill="none" /><line x1="0.5" y1="3.3" x2="9.5" y2="3.3" stroke="black" stroke-width="0.5"/><line x1="0.5" y1="6.6" x2="9.5" y2="6.6" stroke="black" stroke-width="0.5"/><line x1="3.3" y1="0.5" x2="3.3" y2="9.5" stroke="black" stroke-width="0.5"/><line x1="6.6" y1="0.5" x2="6.6" y2="9.5" stroke="black" stroke-width="0.5"/></svg>';
}
function getExpandToolbarIcon() {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -0.5 6 6"><polyline points="1 0.75 3 2.75 1 4.75" fill="none" stroke="black" stroke-width="0.25"/><polyline points="3 0.75 5 2.75 3 4.75" fill="none" stroke="black" stroke-width="0.25"/></svg>';
}
function getCollapseToolbarIcon() {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -0.5 6 6"><polyline points="3 0.75 1 2.75 3 4.75" fill="none" stroke="black" stroke-width="0.25"/><polyline points="5 0.75 3 2.75 5 4.75" fill="none" stroke="black" stroke-width="0.25"/></svg>';
}
function getResetIcon() {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><g transform="scale(1,0.833) translate(0,1.2)"><path d="M8 4 A4 3.5 0 1 1 2 4" fill="none" stroke="black" stroke-width="0.5"/><polyline points="3 5.5 2 4 0 4" fill="none" stroke="black" stroke-width="0.5"/><path d="M5 1 L 5 6.5" fill="none" stroke="black" stroke-width="0.5"/></g></svg>';
}
function getDownloadButton() {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M 4.65 7 L 4.65 1.4 L 5.25 1.4 L 5.25 7 z"/><polyline points="2.07 5.00 4.93 7.14 7.79 5.00" fill="none" stroke="black" stroke-width="0.5"/><path d="M 2 8.5 L 8 8.5 L 8 9 L 2 9 z"/></svg>';
}

function cleanString(stringValue) {
    let value = stringValue
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    if (/^[0-9]/.test(value)) {
        value = "x-" + value;
    }
    return value;
}
function setSize(stringValue, size) {
    return stringValue.replace('viewBox', `width="${size}" height="${size}" viewBox`);
}
function throttle(func, delay) {
    let lastExecTime = 0;
    return function () {
        const context = this;
        const args = arguments;
        const currentTime = Date.now();
        if (currentTime - lastExecTime >= delay) {
            func.apply(context, args);
            lastExecTime = currentTime;
        }
    };
}
function digits(value) {
    return value
        .toString()
        .length;
}
function addNumberOfDigs(number, currentPosOfDims, dimensionName, key) {
    let newObject = {};
    newObject[key] = number;
    const target = currentPosOfDims.find((obj) => obj.key == dimensionName);
    Object.assign(target, newObject);
}
//https://stackoverflow.com/questions/123999/how-can-i-tell-if-a-dom-element-is-visible-in-the-current-viewport
function isElementVisible(element) {
    let rect = element.node().getBoundingClientRect(), vWidth = window.innerWidth || document.documentElement.clientWidth, vHeight = window.innerHeight || document.documentElement.clientHeight, efp = function (x, y) { return document.elementFromPoint(x, y); };
    if (rect.right < 0 || rect.bottom < 0
        || rect.left > vWidth || rect.top > vHeight)
        return false;
    return (element.node().contains(efp(rect.left, rect.top))
        || element.node().contains(efp(rect.right, rect.top))
        || element.node().contains(efp(rect.right, rect.bottom))
        || element.node().contains(efp(rect.left, rect.bottom)));
}
function getMouseCoords(event, targetContainer = document.body) {
    if (targetContainer === document.body) {
        return [event.clientX + window.scrollX, event.clientY + window.scrollY];
    }
    else {
        const rect = targetContainer.getBoundingClientRect();
        return [event.clientX - rect.left, event.clientY - rect.top];
    }
}

let padding;
let paddingXaxis;
let width;
let height;
let yAxis;
let parcoords = {
    xScales: {},
    yScales: {},
    dragging: {},
    dragPosStart: {},
    currentPosOfDims: [],
    newFeatures: null,
    features: [],
    newDataset: null,
    data: null,
};
let active;
let key;
let svg;
let hoverlabel;
let refreshData;
let initDimension;
let canvasEl = null;
let currWebTech = "SVG-DOM";
let currDataset = "default";
const lineState = {};
let benchmarkData = {
    numOfIterations: null,
    avgSpeedTime: null,
};
function setBenchmarkData(newBenchmarkData) {
    benchmarkData = newBenchmarkData;
}
function makeLineInactiveCanvas(currentLineName) {
    lineState[currentLineName] = { active: false };
}
function makeLineActiveCanvas(currentLineName) {
    lineState[currentLineName] = { active: true };
}
function setCurrentWebTech(webTech) {
    currWebTech = webTech;
}
function setCanvasEl(newCanvasEl) {
    canvasEl = newCanvasEl;
}
function setHoverLabel(label) {
    hoverlabel = label;
}
function setYaxis(axis) {
    yAxis = axis;
}
function setRefreshData(data) {
    refreshData = data;
}
function setSvg(svgData) {
    svg = svgData;
}
function setWidth(value) {
    width = value;
}
function setHeight(value) {
    height = value;
}
function setPadding(value) {
    padding = value;
}
function setPaddingXaxis(value) {
    paddingXaxis = value;
}
function setInitDimension(dimensions) {
    initDimension = dimensions;
}
function setActive(paths) {
    active = paths;
}
function setXScales(value) {
    parcoords.xScales = value;
}
function setYScales(value) {
    parcoords.yScales = value;
}
function setNewFeatures(value) {
    parcoords.newFeatures = value;
}
function setFeatures(value) {
    parcoords.features = value;
}
function setNewDataset(value) {
    parcoords.newDataset = value;
}
function setData(value) {
    parcoords.data = value;
}
function setKey(value) {
    key = value;
}

function ascending(a, b) {
  return a == null || b == null ? NaN : a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}

function descending(a, b) {
  return a == null || b == null ? NaN
    : b < a ? -1
    : b > a ? 1
    : b >= a ? 0
    : NaN;
}

function bisector(f) {
  let compare1, compare2, delta;

  // If an accessor is specified, promote it to a comparator. In this case we
  // can test whether the search value is (self-) comparable. We can’t do this
  // for a comparator (except for specific, known comparators) because we can’t
  // tell if the comparator is symmetric, and an asymmetric comparator can’t be
  // used to test whether a single value is comparable.
  if (f.length !== 2) {
    compare1 = ascending;
    compare2 = (d, x) => ascending(f(d), x);
    delta = (d, x) => f(d) - x;
  } else {
    compare1 = f === ascending || f === descending ? f : zero;
    compare2 = f;
    delta = f;
  }

  function left(a, x, lo = 0, hi = a.length) {
    if (lo < hi) {
      if (compare1(x, x) !== 0) return hi;
      do {
        const mid = (lo + hi) >>> 1;
        if (compare2(a[mid], x) < 0) lo = mid + 1;
        else hi = mid;
      } while (lo < hi);
    }
    return lo;
  }

  function right(a, x, lo = 0, hi = a.length) {
    if (lo < hi) {
      if (compare1(x, x) !== 0) return hi;
      do {
        const mid = (lo + hi) >>> 1;
        if (compare2(a[mid], x) <= 0) lo = mid + 1;
        else hi = mid;
      } while (lo < hi);
    }
    return lo;
  }

  function center(a, x, lo = 0, hi = a.length) {
    const i = left(a, x, lo, hi - 1);
    return i > lo && delta(a[i - 1], x) > -delta(a[i], x) ? i - 1 : i;
  }

  return {left, center, right};
}

function zero() {
  return 0;
}

function number$2(x) {
  return x === null ? NaN : +x;
}

const ascendingBisect = bisector(ascending);
const bisectRight = ascendingBisect.right;
bisector(number$2).center;

class InternMap extends Map {
  constructor(entries, key = keyof) {
    super();
    Object.defineProperties(this, {_intern: {value: new Map()}, _key: {value: key}});
    if (entries != null) for (const [key, value] of entries) this.set(key, value);
  }
  get(key) {
    return super.get(intern_get(this, key));
  }
  has(key) {
    return super.has(intern_get(this, key));
  }
  set(key, value) {
    return super.set(intern_set(this, key), value);
  }
  delete(key) {
    return super.delete(intern_delete(this, key));
  }
}

function intern_get({_intern, _key}, value) {
  const key = _key(value);
  return _intern.has(key) ? _intern.get(key) : value;
}

function intern_set({_intern, _key}, value) {
  const key = _key(value);
  if (_intern.has(key)) return _intern.get(key);
  _intern.set(key, value);
  return value;
}

function intern_delete({_intern, _key}, value) {
  const key = _key(value);
  if (_intern.has(key)) {
    value = _intern.get(key);
    _intern.delete(key);
  }
  return value;
}

function keyof(value) {
  return value !== null && typeof value === "object" ? value.valueOf() : value;
}

const e10 = Math.sqrt(50),
    e5 = Math.sqrt(10),
    e2 = Math.sqrt(2);

function tickSpec(start, stop, count) {
  const step = (stop - start) / Math.max(0, count),
      power = Math.floor(Math.log10(step)),
      error = step / Math.pow(10, power),
      factor = error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1;
  let i1, i2, inc;
  if (power < 0) {
    inc = Math.pow(10, -power) / factor;
    i1 = Math.round(start * inc);
    i2 = Math.round(stop * inc);
    if (i1 / inc < start) ++i1;
    if (i2 / inc > stop) --i2;
    inc = -inc;
  } else {
    inc = Math.pow(10, power) * factor;
    i1 = Math.round(start / inc);
    i2 = Math.round(stop / inc);
    if (i1 * inc < start) ++i1;
    if (i2 * inc > stop) --i2;
  }
  if (i2 < i1 && 0.5 <= count && count < 2) return tickSpec(start, stop, count * 2);
  return [i1, i2, inc];
}

function ticks(start, stop, count) {
  stop = +stop, start = +start, count = +count;
  if (!(count > 0)) return [];
  if (start === stop) return [start];
  const reverse = stop < start, [i1, i2, inc] = reverse ? tickSpec(stop, start, count) : tickSpec(start, stop, count);
  if (!(i2 >= i1)) return [];
  const n = i2 - i1 + 1, ticks = new Array(n);
  if (reverse) {
    if (inc < 0) for (let i = 0; i < n; ++i) ticks[i] = (i2 - i) / -inc;
    else for (let i = 0; i < n; ++i) ticks[i] = (i2 - i) * inc;
  } else {
    if (inc < 0) for (let i = 0; i < n; ++i) ticks[i] = (i1 + i) / -inc;
    else for (let i = 0; i < n; ++i) ticks[i] = (i1 + i) * inc;
  }
  return ticks;
}

function tickIncrement(start, stop, count) {
  stop = +stop, start = +start, count = +count;
  return tickSpec(start, stop, count)[2];
}

function tickStep(start, stop, count) {
  stop = +stop, start = +start, count = +count;
  const reverse = stop < start, inc = reverse ? tickIncrement(stop, start, count) : tickIncrement(start, stop, count);
  return (reverse ? -1 : 1) * (inc < 0 ? 1 / -inc : inc);
}

function range(start, stop, step) {
  start = +start, stop = +stop, step = (n = arguments.length) < 2 ? (stop = start, start = 0, 1) : n < 3 ? 1 : +step;

  var i = -1,
      n = Math.max(0, Math.ceil((stop - start) / step)) | 0,
      range = new Array(n);

  while (++i < n) {
    range[i] = start + i * step;
  }

  return range;
}

function initRange(domain, range) {
  switch (arguments.length) {
    case 0: break;
    case 1: this.range(domain); break;
    default: this.range(range).domain(domain); break;
  }
  return this;
}

const implicit = Symbol("implicit");

function ordinal() {
  var index = new InternMap(),
      domain = [],
      range = [],
      unknown = implicit;

  function scale(d) {
    let i = index.get(d);
    if (i === undefined) {
      if (unknown !== implicit) return unknown;
      index.set(d, i = domain.push(d) - 1);
    }
    return range[i % range.length];
  }

  scale.domain = function(_) {
    if (!arguments.length) return domain.slice();
    domain = [], index = new InternMap();
    for (const value of _) {
      if (index.has(value)) continue;
      index.set(value, domain.push(value) - 1);
    }
    return scale;
  };

  scale.range = function(_) {
    return arguments.length ? (range = Array.from(_), scale) : range.slice();
  };

  scale.unknown = function(_) {
    return arguments.length ? (unknown = _, scale) : unknown;
  };

  scale.copy = function() {
    return ordinal(domain, range).unknown(unknown);
  };

  initRange.apply(scale, arguments);

  return scale;
}

function band() {
  var scale = ordinal().unknown(undefined),
      domain = scale.domain,
      ordinalRange = scale.range,
      r0 = 0,
      r1 = 1,
      step,
      bandwidth,
      round = false,
      paddingInner = 0,
      paddingOuter = 0,
      align = 0.5;

  delete scale.unknown;

  function rescale() {
    var n = domain().length,
        reverse = r1 < r0,
        start = reverse ? r1 : r0,
        stop = reverse ? r0 : r1;
    step = (stop - start) / Math.max(1, n - paddingInner + paddingOuter * 2);
    if (round) step = Math.floor(step);
    start += (stop - start - step * (n - paddingInner)) * align;
    bandwidth = step * (1 - paddingInner);
    if (round) start = Math.round(start), bandwidth = Math.round(bandwidth);
    var values = range(n).map(function(i) { return start + step * i; });
    return ordinalRange(reverse ? values.reverse() : values);
  }

  scale.domain = function(_) {
    return arguments.length ? (domain(_), rescale()) : domain();
  };

  scale.range = function(_) {
    return arguments.length ? ([r0, r1] = _, r0 = +r0, r1 = +r1, rescale()) : [r0, r1];
  };

  scale.rangeRound = function(_) {
    return [r0, r1] = _, r0 = +r0, r1 = +r1, round = true, rescale();
  };

  scale.bandwidth = function() {
    return bandwidth;
  };

  scale.step = function() {
    return step;
  };

  scale.round = function(_) {
    return arguments.length ? (round = !!_, rescale()) : round;
  };

  scale.padding = function(_) {
    return arguments.length ? (paddingInner = Math.min(1, paddingOuter = +_), rescale()) : paddingInner;
  };

  scale.paddingInner = function(_) {
    return arguments.length ? (paddingInner = Math.min(1, _), rescale()) : paddingInner;
  };

  scale.paddingOuter = function(_) {
    return arguments.length ? (paddingOuter = +_, rescale()) : paddingOuter;
  };

  scale.align = function(_) {
    return arguments.length ? (align = Math.max(0, Math.min(1, _)), rescale()) : align;
  };

  scale.copy = function() {
    return band(domain(), [r0, r1])
        .round(round)
        .paddingInner(paddingInner)
        .paddingOuter(paddingOuter)
        .align(align);
  };

  return initRange.apply(rescale(), arguments);
}

function pointish(scale) {
  var copy = scale.copy;

  scale.padding = scale.paddingOuter;
  delete scale.paddingInner;
  delete scale.paddingOuter;

  scale.copy = function() {
    return pointish(copy());
  };

  return scale;
}

function point$4() {
  return pointish(band.apply(null, arguments).paddingInner(1));
}

function constants(x) {
  return function() {
    return x;
  };
}

function number$1(x) {
  return +x;
}

var unit = [0, 1];

function identity$2(x) {
  return x;
}

function normalize(a, b) {
  return (b -= (a = +a))
      ? function(x) { return (x - a) / b; }
      : constants(isNaN(b) ? NaN : 0.5);
}

function clamper(a, b) {
  var t;
  if (a > b) t = a, a = b, b = t;
  return function(x) { return Math.max(a, Math.min(b, x)); };
}

// normalize(a, b)(x) takes a domain value x in [a,b] and returns the corresponding parameter t in [0,1].
// interpolate(a, b)(t) takes a parameter t in [0,1] and returns the corresponding range value x in [a,b].
function bimap(domain, range, interpolate) {
  var d0 = domain[0], d1 = domain[1], r0 = range[0], r1 = range[1];
  if (d1 < d0) d0 = normalize(d1, d0), r0 = interpolate(r1, r0);
  else d0 = normalize(d0, d1), r0 = interpolate(r0, r1);
  return function(x) { return r0(d0(x)); };
}

function polymap(domain, range, interpolate) {
  var j = Math.min(domain.length, range.length) - 1,
      d = new Array(j),
      r = new Array(j),
      i = -1;

  // Reverse descending domains.
  if (domain[j] < domain[0]) {
    domain = domain.slice().reverse();
    range = range.slice().reverse();
  }

  while (++i < j) {
    d[i] = normalize(domain[i], domain[i + 1]);
    r[i] = interpolate(range[i], range[i + 1]);
  }

  return function(x) {
    var i = bisectRight(domain, x, 1, j) - 1;
    return r[i](d[i](x));
  };
}

function copy(source, target) {
  return target
      .domain(source.domain())
      .range(source.range())
      .interpolate(source.interpolate())
      .clamp(source.clamp())
      .unknown(source.unknown());
}

function transformer() {
  var domain = unit,
      range = unit,
      interpolate = interpolate$1,
      transform,
      untransform,
      unknown,
      clamp = identity$2,
      piecewise,
      output,
      input;

  function rescale() {
    var n = Math.min(domain.length, range.length);
    if (clamp !== identity$2) clamp = clamper(domain[0], domain[n - 1]);
    piecewise = n > 2 ? polymap : bimap;
    output = input = null;
    return scale;
  }

  function scale(x) {
    return x == null || isNaN(x = +x) ? unknown : (output || (output = piecewise(domain.map(transform), range, interpolate)))(transform(clamp(x)));
  }

  scale.invert = function(y) {
    return clamp(untransform((input || (input = piecewise(range, domain.map(transform), interpolateNumber)))(y)));
  };

  scale.domain = function(_) {
    return arguments.length ? (domain = Array.from(_, number$1), rescale()) : domain.slice();
  };

  scale.range = function(_) {
    return arguments.length ? (range = Array.from(_), rescale()) : range.slice();
  };

  scale.rangeRound = function(_) {
    return range = Array.from(_), interpolate = interpolateRound, rescale();
  };

  scale.clamp = function(_) {
    return arguments.length ? (clamp = _ ? true : identity$2, rescale()) : clamp !== identity$2;
  };

  scale.interpolate = function(_) {
    return arguments.length ? (interpolate = _, rescale()) : interpolate;
  };

  scale.unknown = function(_) {
    return arguments.length ? (unknown = _, scale) : unknown;
  };

  return function(t, u) {
    transform = t, untransform = u;
    return rescale();
  };
}

function continuous() {
  return transformer()(identity$2, identity$2);
}

function formatDecimal(x) {
  return Math.abs(x = Math.round(x)) >= 1e21
      ? x.toLocaleString("en").replace(/,/g, "")
      : x.toString(10);
}

// Computes the decimal coefficient and exponent of the specified number x with
// significant digits p, where x is positive and p is in [1, 21] or undefined.
// For example, formatDecimalParts(1.23) returns ["123", 0].
function formatDecimalParts(x, p) {
  if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ±Infinity
  var i, coefficient = x.slice(0, i);

  // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
  // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
  return [
    coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
    +x.slice(i + 1)
  ];
}

function exponent(x) {
  return x = formatDecimalParts(Math.abs(x)), x ? x[1] : NaN;
}

function formatGroup(grouping, thousands) {
  return function(value, width) {
    var i = value.length,
        t = [],
        j = 0,
        g = grouping[0],
        length = 0;

    while (i > 0 && g > 0) {
      if (length + g + 1 > width) g = Math.max(1, width - length);
      t.push(value.substring(i -= g, i + g));
      if ((length += g + 1) > width) break;
      g = grouping[j = (j + 1) % grouping.length];
    }

    return t.reverse().join(thousands);
  };
}

function formatNumerals(numerals) {
  return function(value) {
    return value.replace(/[0-9]/g, function(i) {
      return numerals[+i];
    });
  };
}

// [[fill]align][sign][symbol][0][width][,][.precision][~][type]
var re = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;

function formatSpecifier(specifier) {
  if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);
  var match;
  return new FormatSpecifier({
    fill: match[1],
    align: match[2],
    sign: match[3],
    symbol: match[4],
    zero: match[5],
    width: match[6],
    comma: match[7],
    precision: match[8] && match[8].slice(1),
    trim: match[9],
    type: match[10]
  });
}

formatSpecifier.prototype = FormatSpecifier.prototype; // instanceof

function FormatSpecifier(specifier) {
  this.fill = specifier.fill === undefined ? " " : specifier.fill + "";
  this.align = specifier.align === undefined ? ">" : specifier.align + "";
  this.sign = specifier.sign === undefined ? "-" : specifier.sign + "";
  this.symbol = specifier.symbol === undefined ? "" : specifier.symbol + "";
  this.zero = !!specifier.zero;
  this.width = specifier.width === undefined ? undefined : +specifier.width;
  this.comma = !!specifier.comma;
  this.precision = specifier.precision === undefined ? undefined : +specifier.precision;
  this.trim = !!specifier.trim;
  this.type = specifier.type === undefined ? "" : specifier.type + "";
}

FormatSpecifier.prototype.toString = function() {
  return this.fill
      + this.align
      + this.sign
      + this.symbol
      + (this.zero ? "0" : "")
      + (this.width === undefined ? "" : Math.max(1, this.width | 0))
      + (this.comma ? "," : "")
      + (this.precision === undefined ? "" : "." + Math.max(0, this.precision | 0))
      + (this.trim ? "~" : "")
      + this.type;
};

// Trims insignificant zeros, e.g., replaces 1.2000k with 1.2k.
function formatTrim(s) {
  out: for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) {
    switch (s[i]) {
      case ".": i0 = i1 = i; break;
      case "0": if (i0 === 0) i0 = i; i1 = i; break;
      default: if (!+s[i]) break out; if (i0 > 0) i0 = 0; break;
    }
  }
  return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
}

var prefixExponent;

function formatPrefixAuto(x, p) {
  var d = formatDecimalParts(x, p);
  if (!d) return x + "";
  var coefficient = d[0],
      exponent = d[1],
      i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1,
      n = coefficient.length;
  return i === n ? coefficient
      : i > n ? coefficient + new Array(i - n + 1).join("0")
      : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i)
      : "0." + new Array(1 - i).join("0") + formatDecimalParts(x, Math.max(0, p + i - 1))[0]; // less than 1y!
}

function formatRounded(x, p) {
  var d = formatDecimalParts(x, p);
  if (!d) return x + "";
  var coefficient = d[0],
      exponent = d[1];
  return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient
      : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1)
      : coefficient + new Array(exponent - coefficient.length + 2).join("0");
}

var formatTypes = {
  "%": (x, p) => (x * 100).toFixed(p),
  "b": (x) => Math.round(x).toString(2),
  "c": (x) => x + "",
  "d": formatDecimal,
  "e": (x, p) => x.toExponential(p),
  "f": (x, p) => x.toFixed(p),
  "g": (x, p) => x.toPrecision(p),
  "o": (x) => Math.round(x).toString(8),
  "p": (x, p) => formatRounded(x * 100, p),
  "r": formatRounded,
  "s": formatPrefixAuto,
  "X": (x) => Math.round(x).toString(16).toUpperCase(),
  "x": (x) => Math.round(x).toString(16)
};

function identity$1(x) {
  return x;
}

var map = Array.prototype.map,
    prefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];

function formatLocale$1(locale) {
  var group = locale.grouping === undefined || locale.thousands === undefined ? identity$1 : formatGroup(map.call(locale.grouping, Number), locale.thousands + ""),
      currencyPrefix = locale.currency === undefined ? "" : locale.currency[0] + "",
      currencySuffix = locale.currency === undefined ? "" : locale.currency[1] + "",
      decimal = locale.decimal === undefined ? "." : locale.decimal + "",
      numerals = locale.numerals === undefined ? identity$1 : formatNumerals(map.call(locale.numerals, String)),
      percent = locale.percent === undefined ? "%" : locale.percent + "",
      minus = locale.minus === undefined ? "−" : locale.minus + "",
      nan = locale.nan === undefined ? "NaN" : locale.nan + "";

  function newFormat(specifier) {
    specifier = formatSpecifier(specifier);

    var fill = specifier.fill,
        align = specifier.align,
        sign = specifier.sign,
        symbol = specifier.symbol,
        zero = specifier.zero,
        width = specifier.width,
        comma = specifier.comma,
        precision = specifier.precision,
        trim = specifier.trim,
        type = specifier.type;

    // The "n" type is an alias for ",g".
    if (type === "n") comma = true, type = "g";

    // The "" type, and any invalid type, is an alias for ".12~g".
    else if (!formatTypes[type]) precision === undefined && (precision = 12), trim = true, type = "g";

    // If zero fill is specified, padding goes after sign and before digits.
    if (zero || (fill === "0" && align === "=")) zero = true, fill = "0", align = "=";

    // Compute the prefix and suffix.
    // For SI-prefix, the suffix is lazily computed.
    var prefix = symbol === "$" ? currencyPrefix : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
        suffix = symbol === "$" ? currencySuffix : /[%p]/.test(type) ? percent : "";

    // What format function should we use?
    // Is this an integer type?
    // Can this type generate exponential notation?
    var formatType = formatTypes[type],
        maybeSuffix = /[defgprs%]/.test(type);

    // Set the default precision if not specified,
    // or clamp the specified precision to the supported range.
    // For significant precision, it must be in [1, 21].
    // For fixed precision, it must be in [0, 20].
    precision = precision === undefined ? 6
        : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision))
        : Math.max(0, Math.min(20, precision));

    function format(value) {
      var valuePrefix = prefix,
          valueSuffix = suffix,
          i, n, c;

      if (type === "c") {
        valueSuffix = formatType(value) + valueSuffix;
        value = "";
      } else {
        value = +value;

        // Determine the sign. -0 is not less than 0, but 1 / -0 is!
        var valueNegative = value < 0 || 1 / value < 0;

        // Perform the initial formatting.
        value = isNaN(value) ? nan : formatType(Math.abs(value), precision);

        // Trim insignificant zeros.
        if (trim) value = formatTrim(value);

        // If a negative value rounds to zero after formatting, and no explicit positive sign is requested, hide the sign.
        if (valueNegative && +value === 0 && sign !== "+") valueNegative = false;

        // Compute the prefix and suffix.
        valuePrefix = (valueNegative ? (sign === "(" ? sign : minus) : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
        valueSuffix = (type === "s" ? prefixes[8 + prefixExponent / 3] : "") + valueSuffix + (valueNegative && sign === "(" ? ")" : "");

        // Break the formatted value into the integer “value” part that can be
        // grouped, and fractional or exponential “suffix” part that is not.
        if (maybeSuffix) {
          i = -1, n = value.length;
          while (++i < n) {
            if (c = value.charCodeAt(i), 48 > c || c > 57) {
              valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
              value = value.slice(0, i);
              break;
            }
          }
        }
      }

      // If the fill character is not "0", grouping is applied before padding.
      if (comma && !zero) value = group(value, Infinity);

      // Compute the padding.
      var length = valuePrefix.length + value.length + valueSuffix.length,
          padding = length < width ? new Array(width - length + 1).join(fill) : "";

      // If the fill character is "0", grouping is applied after padding.
      if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";

      // Reconstruct the final output based on the desired alignment.
      switch (align) {
        case "<": value = valuePrefix + value + valueSuffix + padding; break;
        case "=": value = valuePrefix + padding + value + valueSuffix; break;
        case "^": value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length); break;
        default: value = padding + valuePrefix + value + valueSuffix; break;
      }

      return numerals(value);
    }

    format.toString = function() {
      return specifier + "";
    };

    return format;
  }

  function formatPrefix(specifier, value) {
    var f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier)),
        e = Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3,
        k = Math.pow(10, -e),
        prefix = prefixes[8 + e / 3];
    return function(value) {
      return f(k * value) + prefix;
    };
  }

  return {
    format: newFormat,
    formatPrefix: formatPrefix
  };
}

var locale$1;
var format;
var formatPrefix;

defaultLocale$1({
  thousands: ",",
  grouping: [3],
  currency: ["$", ""]
});

function defaultLocale$1(definition) {
  locale$1 = formatLocale$1(definition);
  format = locale$1.format;
  formatPrefix = locale$1.formatPrefix;
  return locale$1;
}

function precisionFixed(step) {
  return Math.max(0, -exponent(Math.abs(step)));
}

function precisionPrefix(step, value) {
  return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3 - exponent(Math.abs(step)));
}

function precisionRound(step, max) {
  step = Math.abs(step), max = Math.abs(max) - step;
  return Math.max(0, exponent(max) - exponent(step)) + 1;
}

function tickFormat(start, stop, count, specifier) {
  var step = tickStep(start, stop, count),
      precision;
  specifier = formatSpecifier(specifier == null ? ",f" : specifier);
  switch (specifier.type) {
    case "s": {
      var value = Math.max(Math.abs(start), Math.abs(stop));
      if (specifier.precision == null && !isNaN(precision = precisionPrefix(step, value))) specifier.precision = precision;
      return formatPrefix(specifier, value);
    }
    case "":
    case "e":
    case "g":
    case "p":
    case "r": {
      if (specifier.precision == null && !isNaN(precision = precisionRound(step, Math.max(Math.abs(start), Math.abs(stop))))) specifier.precision = precision - (specifier.type === "e");
      break;
    }
    case "f":
    case "%": {
      if (specifier.precision == null && !isNaN(precision = precisionFixed(step))) specifier.precision = precision - (specifier.type === "%") * 2;
      break;
    }
  }
  return format(specifier);
}

function linearish(scale) {
  var domain = scale.domain;

  scale.ticks = function(count) {
    var d = domain();
    return ticks(d[0], d[d.length - 1], count == null ? 10 : count);
  };

  scale.tickFormat = function(count, specifier) {
    var d = domain();
    return tickFormat(d[0], d[d.length - 1], count == null ? 10 : count, specifier);
  };

  scale.nice = function(count) {
    if (count == null) count = 10;

    var d = domain();
    var i0 = 0;
    var i1 = d.length - 1;
    var start = d[i0];
    var stop = d[i1];
    var prestep;
    var step;
    var maxIter = 10;

    if (stop < start) {
      step = start, start = stop, stop = step;
      step = i0, i0 = i1, i1 = step;
    }
    
    while (maxIter-- > 0) {
      step = tickIncrement(start, stop, count);
      if (step === prestep) {
        d[i0] = start;
        d[i1] = stop;
        return domain(d);
      } else if (step > 0) {
        start = Math.floor(start / step) * step;
        stop = Math.ceil(stop / step) * step;
      } else if (step < 0) {
        start = Math.ceil(start * step) / step;
        stop = Math.floor(stop * step) / step;
      } else {
        break;
      }
      prestep = step;
    }

    return scale;
  };

  return scale;
}

function linear() {
  var scale = continuous();

  scale.copy = function() {
    return copy(scale, linear());
  };

  initRange.apply(scale, arguments);

  return linearish(scale);
}

const t0 = new Date, t1 = new Date;

function timeInterval(floori, offseti, count, field) {

  function interval(date) {
    return floori(date = arguments.length === 0 ? new Date : new Date(+date)), date;
  }

  interval.floor = (date) => {
    return floori(date = new Date(+date)), date;
  };

  interval.ceil = (date) => {
    return floori(date = new Date(date - 1)), offseti(date, 1), floori(date), date;
  };

  interval.round = (date) => {
    const d0 = interval(date), d1 = interval.ceil(date);
    return date - d0 < d1 - date ? d0 : d1;
  };

  interval.offset = (date, step) => {
    return offseti(date = new Date(+date), step == null ? 1 : Math.floor(step)), date;
  };

  interval.range = (start, stop, step) => {
    const range = [];
    start = interval.ceil(start);
    step = step == null ? 1 : Math.floor(step);
    if (!(start < stop) || !(step > 0)) return range; // also handles Invalid Date
    let previous;
    do range.push(previous = new Date(+start)), offseti(start, step), floori(start);
    while (previous < start && start < stop);
    return range;
  };

  interval.filter = (test) => {
    return timeInterval((date) => {
      if (date >= date) while (floori(date), !test(date)) date.setTime(date - 1);
    }, (date, step) => {
      if (date >= date) {
        if (step < 0) while (++step <= 0) {
          while (offseti(date, -1), !test(date)) {} // eslint-disable-line no-empty
        } else while (--step >= 0) {
          while (offseti(date, +1), !test(date)) {} // eslint-disable-line no-empty
        }
      }
    });
  };

  if (count) {
    interval.count = (start, end) => {
      t0.setTime(+start), t1.setTime(+end);
      floori(t0), floori(t1);
      return Math.floor(count(t0, t1));
    };

    interval.every = (step) => {
      step = Math.floor(step);
      return !isFinite(step) || !(step > 0) ? null
          : !(step > 1) ? interval
          : interval.filter(field
              ? (d) => field(d) % step === 0
              : (d) => interval.count(0, d) % step === 0);
    };
  }

  return interval;
}

const millisecond = timeInterval(() => {
  // noop
}, (date, step) => {
  date.setTime(+date + step);
}, (start, end) => {
  return end - start;
});

// An optimized implementation for this simple case.
millisecond.every = (k) => {
  k = Math.floor(k);
  if (!isFinite(k) || !(k > 0)) return null;
  if (!(k > 1)) return millisecond;
  return timeInterval((date) => {
    date.setTime(Math.floor(date / k) * k);
  }, (date, step) => {
    date.setTime(+date + step * k);
  }, (start, end) => {
    return (end - start) / k;
  });
};

millisecond.range;

const durationSecond = 1000;
const durationMinute = durationSecond * 60;
const durationHour = durationMinute * 60;
const durationDay = durationHour * 24;
const durationWeek = durationDay * 7;

const second = timeInterval((date) => {
  date.setTime(date - date.getMilliseconds());
}, (date, step) => {
  date.setTime(+date + step * durationSecond);
}, (start, end) => {
  return (end - start) / durationSecond;
}, (date) => {
  return date.getUTCSeconds();
});

second.range;

const timeMinute = timeInterval((date) => {
  date.setTime(date - date.getMilliseconds() - date.getSeconds() * durationSecond);
}, (date, step) => {
  date.setTime(+date + step * durationMinute);
}, (start, end) => {
  return (end - start) / durationMinute;
}, (date) => {
  return date.getMinutes();
});

timeMinute.range;

const utcMinute = timeInterval((date) => {
  date.setUTCSeconds(0, 0);
}, (date, step) => {
  date.setTime(+date + step * durationMinute);
}, (start, end) => {
  return (end - start) / durationMinute;
}, (date) => {
  return date.getUTCMinutes();
});

utcMinute.range;

const timeHour = timeInterval((date) => {
  date.setTime(date - date.getMilliseconds() - date.getSeconds() * durationSecond - date.getMinutes() * durationMinute);
}, (date, step) => {
  date.setTime(+date + step * durationHour);
}, (start, end) => {
  return (end - start) / durationHour;
}, (date) => {
  return date.getHours();
});

timeHour.range;

const utcHour = timeInterval((date) => {
  date.setUTCMinutes(0, 0, 0);
}, (date, step) => {
  date.setTime(+date + step * durationHour);
}, (start, end) => {
  return (end - start) / durationHour;
}, (date) => {
  return date.getUTCHours();
});

utcHour.range;

const timeDay = timeInterval(
  date => date.setHours(0, 0, 0, 0),
  (date, step) => date.setDate(date.getDate() + step),
  (start, end) => (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationDay,
  date => date.getDate() - 1
);

timeDay.range;

const utcDay = timeInterval((date) => {
  date.setUTCHours(0, 0, 0, 0);
}, (date, step) => {
  date.setUTCDate(date.getUTCDate() + step);
}, (start, end) => {
  return (end - start) / durationDay;
}, (date) => {
  return date.getUTCDate() - 1;
});

utcDay.range;

const unixDay = timeInterval((date) => {
  date.setUTCHours(0, 0, 0, 0);
}, (date, step) => {
  date.setUTCDate(date.getUTCDate() + step);
}, (start, end) => {
  return (end - start) / durationDay;
}, (date) => {
  return Math.floor(date / durationDay);
});

unixDay.range;

function timeWeekday(i) {
  return timeInterval((date) => {
    date.setDate(date.getDate() - (date.getDay() + 7 - i) % 7);
    date.setHours(0, 0, 0, 0);
  }, (date, step) => {
    date.setDate(date.getDate() + step * 7);
  }, (start, end) => {
    return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationWeek;
  });
}

const timeSunday = timeWeekday(0);
const timeMonday = timeWeekday(1);
const timeTuesday = timeWeekday(2);
const timeWednesday = timeWeekday(3);
const timeThursday = timeWeekday(4);
const timeFriday = timeWeekday(5);
const timeSaturday = timeWeekday(6);

timeSunday.range;
timeMonday.range;
timeTuesday.range;
timeWednesday.range;
timeThursday.range;
timeFriday.range;
timeSaturday.range;

function utcWeekday(i) {
  return timeInterval((date) => {
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 7 - i) % 7);
    date.setUTCHours(0, 0, 0, 0);
  }, (date, step) => {
    date.setUTCDate(date.getUTCDate() + step * 7);
  }, (start, end) => {
    return (end - start) / durationWeek;
  });
}

const utcSunday = utcWeekday(0);
const utcMonday = utcWeekday(1);
const utcTuesday = utcWeekday(2);
const utcWednesday = utcWeekday(3);
const utcThursday = utcWeekday(4);
const utcFriday = utcWeekday(5);
const utcSaturday = utcWeekday(6);

utcSunday.range;
utcMonday.range;
utcTuesday.range;
utcWednesday.range;
utcThursday.range;
utcFriday.range;
utcSaturday.range;

const timeMonth = timeInterval((date) => {
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
}, (date, step) => {
  date.setMonth(date.getMonth() + step);
}, (start, end) => {
  return end.getMonth() - start.getMonth() + (end.getFullYear() - start.getFullYear()) * 12;
}, (date) => {
  return date.getMonth();
});

timeMonth.range;

const utcMonth = timeInterval((date) => {
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
}, (date, step) => {
  date.setUTCMonth(date.getUTCMonth() + step);
}, (start, end) => {
  return end.getUTCMonth() - start.getUTCMonth() + (end.getUTCFullYear() - start.getUTCFullYear()) * 12;
}, (date) => {
  return date.getUTCMonth();
});

utcMonth.range;

const timeYear = timeInterval((date) => {
  date.setMonth(0, 1);
  date.setHours(0, 0, 0, 0);
}, (date, step) => {
  date.setFullYear(date.getFullYear() + step);
}, (start, end) => {
  return end.getFullYear() - start.getFullYear();
}, (date) => {
  return date.getFullYear();
});

// An optimized implementation for this simple case.
timeYear.every = (k) => {
  return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : timeInterval((date) => {
    date.setFullYear(Math.floor(date.getFullYear() / k) * k);
    date.setMonth(0, 1);
    date.setHours(0, 0, 0, 0);
  }, (date, step) => {
    date.setFullYear(date.getFullYear() + step * k);
  });
};

timeYear.range;

const utcYear = timeInterval((date) => {
  date.setUTCMonth(0, 1);
  date.setUTCHours(0, 0, 0, 0);
}, (date, step) => {
  date.setUTCFullYear(date.getUTCFullYear() + step);
}, (start, end) => {
  return end.getUTCFullYear() - start.getUTCFullYear();
}, (date) => {
  return date.getUTCFullYear();
});

// An optimized implementation for this simple case.
utcYear.every = (k) => {
  return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : timeInterval((date) => {
    date.setUTCFullYear(Math.floor(date.getUTCFullYear() / k) * k);
    date.setUTCMonth(0, 1);
    date.setUTCHours(0, 0, 0, 0);
  }, (date, step) => {
    date.setUTCFullYear(date.getUTCFullYear() + step * k);
  });
};

utcYear.range;

function localDate(d) {
  if (0 <= d.y && d.y < 100) {
    var date = new Date(-1, d.m, d.d, d.H, d.M, d.S, d.L);
    date.setFullYear(d.y);
    return date;
  }
  return new Date(d.y, d.m, d.d, d.H, d.M, d.S, d.L);
}

function utcDate(d) {
  if (0 <= d.y && d.y < 100) {
    var date = new Date(Date.UTC(-1, d.m, d.d, d.H, d.M, d.S, d.L));
    date.setUTCFullYear(d.y);
    return date;
  }
  return new Date(Date.UTC(d.y, d.m, d.d, d.H, d.M, d.S, d.L));
}

function newDate(y, m, d) {
  return {y: y, m: m, d: d, H: 0, M: 0, S: 0, L: 0};
}

function formatLocale(locale) {
  var locale_dateTime = locale.dateTime,
      locale_date = locale.date,
      locale_time = locale.time,
      locale_periods = locale.periods,
      locale_weekdays = locale.days,
      locale_shortWeekdays = locale.shortDays,
      locale_months = locale.months,
      locale_shortMonths = locale.shortMonths;

  var periodRe = formatRe(locale_periods),
      periodLookup = formatLookup(locale_periods),
      weekdayRe = formatRe(locale_weekdays),
      weekdayLookup = formatLookup(locale_weekdays),
      shortWeekdayRe = formatRe(locale_shortWeekdays),
      shortWeekdayLookup = formatLookup(locale_shortWeekdays),
      monthRe = formatRe(locale_months),
      monthLookup = formatLookup(locale_months),
      shortMonthRe = formatRe(locale_shortMonths),
      shortMonthLookup = formatLookup(locale_shortMonths);

  var formats = {
    "a": formatShortWeekday,
    "A": formatWeekday,
    "b": formatShortMonth,
    "B": formatMonth,
    "c": null,
    "d": formatDayOfMonth,
    "e": formatDayOfMonth,
    "f": formatMicroseconds,
    "g": formatYearISO,
    "G": formatFullYearISO,
    "H": formatHour24,
    "I": formatHour12,
    "j": formatDayOfYear,
    "L": formatMilliseconds,
    "m": formatMonthNumber,
    "M": formatMinutes,
    "p": formatPeriod,
    "q": formatQuarter,
    "Q": formatUnixTimestamp,
    "s": formatUnixTimestampSeconds,
    "S": formatSeconds,
    "u": formatWeekdayNumberMonday,
    "U": formatWeekNumberSunday,
    "V": formatWeekNumberISO,
    "w": formatWeekdayNumberSunday,
    "W": formatWeekNumberMonday,
    "x": null,
    "X": null,
    "y": formatYear$1,
    "Y": formatFullYear,
    "Z": formatZone,
    "%": formatLiteralPercent
  };

  var utcFormats = {
    "a": formatUTCShortWeekday,
    "A": formatUTCWeekday,
    "b": formatUTCShortMonth,
    "B": formatUTCMonth,
    "c": null,
    "d": formatUTCDayOfMonth,
    "e": formatUTCDayOfMonth,
    "f": formatUTCMicroseconds,
    "g": formatUTCYearISO,
    "G": formatUTCFullYearISO,
    "H": formatUTCHour24,
    "I": formatUTCHour12,
    "j": formatUTCDayOfYear,
    "L": formatUTCMilliseconds,
    "m": formatUTCMonthNumber,
    "M": formatUTCMinutes,
    "p": formatUTCPeriod,
    "q": formatUTCQuarter,
    "Q": formatUnixTimestamp,
    "s": formatUnixTimestampSeconds,
    "S": formatUTCSeconds,
    "u": formatUTCWeekdayNumberMonday,
    "U": formatUTCWeekNumberSunday,
    "V": formatUTCWeekNumberISO,
    "w": formatUTCWeekdayNumberSunday,
    "W": formatUTCWeekNumberMonday,
    "x": null,
    "X": null,
    "y": formatUTCYear,
    "Y": formatUTCFullYear,
    "Z": formatUTCZone,
    "%": formatLiteralPercent
  };

  var parses = {
    "a": parseShortWeekday,
    "A": parseWeekday,
    "b": parseShortMonth,
    "B": parseMonth,
    "c": parseLocaleDateTime,
    "d": parseDayOfMonth,
    "e": parseDayOfMonth,
    "f": parseMicroseconds,
    "g": parseYear,
    "G": parseFullYear,
    "H": parseHour24,
    "I": parseHour24,
    "j": parseDayOfYear,
    "L": parseMilliseconds,
    "m": parseMonthNumber,
    "M": parseMinutes,
    "p": parsePeriod,
    "q": parseQuarter,
    "Q": parseUnixTimestamp,
    "s": parseUnixTimestampSeconds,
    "S": parseSeconds,
    "u": parseWeekdayNumberMonday,
    "U": parseWeekNumberSunday,
    "V": parseWeekNumberISO,
    "w": parseWeekdayNumberSunday,
    "W": parseWeekNumberMonday,
    "x": parseLocaleDate,
    "X": parseLocaleTime,
    "y": parseYear,
    "Y": parseFullYear,
    "Z": parseZone,
    "%": parseLiteralPercent
  };

  // These recursive directive definitions must be deferred.
  formats.x = newFormat(locale_date, formats);
  formats.X = newFormat(locale_time, formats);
  formats.c = newFormat(locale_dateTime, formats);
  utcFormats.x = newFormat(locale_date, utcFormats);
  utcFormats.X = newFormat(locale_time, utcFormats);
  utcFormats.c = newFormat(locale_dateTime, utcFormats);

  function newFormat(specifier, formats) {
    return function(date) {
      var string = [],
          i = -1,
          j = 0,
          n = specifier.length,
          c,
          pad,
          format;

      if (!(date instanceof Date)) date = new Date(+date);

      while (++i < n) {
        if (specifier.charCodeAt(i) === 37) {
          string.push(specifier.slice(j, i));
          if ((pad = pads[c = specifier.charAt(++i)]) != null) c = specifier.charAt(++i);
          else pad = c === "e" ? " " : "0";
          if (format = formats[c]) c = format(date, pad);
          string.push(c);
          j = i + 1;
        }
      }

      string.push(specifier.slice(j, i));
      return string.join("");
    };
  }

  function newParse(specifier, Z) {
    return function(string) {
      var d = newDate(1900, undefined, 1),
          i = parseSpecifier(d, specifier, string += "", 0),
          week, day;
      if (i != string.length) return null;

      // If a UNIX timestamp is specified, return it.
      if ("Q" in d) return new Date(d.Q);
      if ("s" in d) return new Date(d.s * 1000 + ("L" in d ? d.L : 0));

      // If this is utcParse, never use the local timezone.
      if (Z && !("Z" in d)) d.Z = 0;

      // The am-pm flag is 0 for AM, and 1 for PM.
      if ("p" in d) d.H = d.H % 12 + d.p * 12;

      // If the month was not specified, inherit from the quarter.
      if (d.m === undefined) d.m = "q" in d ? d.q : 0;

      // Convert day-of-week and week-of-year to day-of-year.
      if ("V" in d) {
        if (d.V < 1 || d.V > 53) return null;
        if (!("w" in d)) d.w = 1;
        if ("Z" in d) {
          week = utcDate(newDate(d.y, 0, 1)), day = week.getUTCDay();
          week = day > 4 || day === 0 ? utcMonday.ceil(week) : utcMonday(week);
          week = utcDay.offset(week, (d.V - 1) * 7);
          d.y = week.getUTCFullYear();
          d.m = week.getUTCMonth();
          d.d = week.getUTCDate() + (d.w + 6) % 7;
        } else {
          week = localDate(newDate(d.y, 0, 1)), day = week.getDay();
          week = day > 4 || day === 0 ? timeMonday.ceil(week) : timeMonday(week);
          week = timeDay.offset(week, (d.V - 1) * 7);
          d.y = week.getFullYear();
          d.m = week.getMonth();
          d.d = week.getDate() + (d.w + 6) % 7;
        }
      } else if ("W" in d || "U" in d) {
        if (!("w" in d)) d.w = "u" in d ? d.u % 7 : "W" in d ? 1 : 0;
        day = "Z" in d ? utcDate(newDate(d.y, 0, 1)).getUTCDay() : localDate(newDate(d.y, 0, 1)).getDay();
        d.m = 0;
        d.d = "W" in d ? (d.w + 6) % 7 + d.W * 7 - (day + 5) % 7 : d.w + d.U * 7 - (day + 6) % 7;
      }

      // If a time zone is specified, all fields are interpreted as UTC and then
      // offset according to the specified time zone.
      if ("Z" in d) {
        d.H += d.Z / 100 | 0;
        d.M += d.Z % 100;
        return utcDate(d);
      }

      // Otherwise, all fields are in local time.
      return localDate(d);
    };
  }

  function parseSpecifier(d, specifier, string, j) {
    var i = 0,
        n = specifier.length,
        m = string.length,
        c,
        parse;

    while (i < n) {
      if (j >= m) return -1;
      c = specifier.charCodeAt(i++);
      if (c === 37) {
        c = specifier.charAt(i++);
        parse = parses[c in pads ? specifier.charAt(i++) : c];
        if (!parse || ((j = parse(d, string, j)) < 0)) return -1;
      } else if (c != string.charCodeAt(j++)) {
        return -1;
      }
    }

    return j;
  }

  function parsePeriod(d, string, i) {
    var n = periodRe.exec(string.slice(i));
    return n ? (d.p = periodLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }

  function parseShortWeekday(d, string, i) {
    var n = shortWeekdayRe.exec(string.slice(i));
    return n ? (d.w = shortWeekdayLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }

  function parseWeekday(d, string, i) {
    var n = weekdayRe.exec(string.slice(i));
    return n ? (d.w = weekdayLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }

  function parseShortMonth(d, string, i) {
    var n = shortMonthRe.exec(string.slice(i));
    return n ? (d.m = shortMonthLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }

  function parseMonth(d, string, i) {
    var n = monthRe.exec(string.slice(i));
    return n ? (d.m = monthLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }

  function parseLocaleDateTime(d, string, i) {
    return parseSpecifier(d, locale_dateTime, string, i);
  }

  function parseLocaleDate(d, string, i) {
    return parseSpecifier(d, locale_date, string, i);
  }

  function parseLocaleTime(d, string, i) {
    return parseSpecifier(d, locale_time, string, i);
  }

  function formatShortWeekday(d) {
    return locale_shortWeekdays[d.getDay()];
  }

  function formatWeekday(d) {
    return locale_weekdays[d.getDay()];
  }

  function formatShortMonth(d) {
    return locale_shortMonths[d.getMonth()];
  }

  function formatMonth(d) {
    return locale_months[d.getMonth()];
  }

  function formatPeriod(d) {
    return locale_periods[+(d.getHours() >= 12)];
  }

  function formatQuarter(d) {
    return 1 + ~~(d.getMonth() / 3);
  }

  function formatUTCShortWeekday(d) {
    return locale_shortWeekdays[d.getUTCDay()];
  }

  function formatUTCWeekday(d) {
    return locale_weekdays[d.getUTCDay()];
  }

  function formatUTCShortMonth(d) {
    return locale_shortMonths[d.getUTCMonth()];
  }

  function formatUTCMonth(d) {
    return locale_months[d.getUTCMonth()];
  }

  function formatUTCPeriod(d) {
    return locale_periods[+(d.getUTCHours() >= 12)];
  }

  function formatUTCQuarter(d) {
    return 1 + ~~(d.getUTCMonth() / 3);
  }

  return {
    format: function(specifier) {
      var f = newFormat(specifier += "", formats);
      f.toString = function() { return specifier; };
      return f;
    },
    parse: function(specifier) {
      var p = newParse(specifier += "", false);
      p.toString = function() { return specifier; };
      return p;
    },
    utcFormat: function(specifier) {
      var f = newFormat(specifier += "", utcFormats);
      f.toString = function() { return specifier; };
      return f;
    },
    utcParse: function(specifier) {
      var p = newParse(specifier += "", true);
      p.toString = function() { return specifier; };
      return p;
    }
  };
}

var pads = {"-": "", "_": " ", "0": "0"},
    numberRe = /^\s*\d+/, // note: ignores next directive
    percentRe = /^%/,
    requoteRe = /[\\^$*+?|[\]().{}]/g;

function pad$1(value, fill, width) {
  var sign = value < 0 ? "-" : "",
      string = (sign ? -value : value) + "",
      length = string.length;
  return sign + (length < width ? new Array(width - length + 1).join(fill) + string : string);
}

function requote(s) {
  return s.replace(requoteRe, "\\$&");
}

function formatRe(names) {
  return new RegExp("^(?:" + names.map(requote).join("|") + ")", "i");
}

function formatLookup(names) {
  return new Map(names.map((name, i) => [name.toLowerCase(), i]));
}

function parseWeekdayNumberSunday(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 1));
  return n ? (d.w = +n[0], i + n[0].length) : -1;
}

function parseWeekdayNumberMonday(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 1));
  return n ? (d.u = +n[0], i + n[0].length) : -1;
}

function parseWeekNumberSunday(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.U = +n[0], i + n[0].length) : -1;
}

function parseWeekNumberISO(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.V = +n[0], i + n[0].length) : -1;
}

function parseWeekNumberMonday(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.W = +n[0], i + n[0].length) : -1;
}

function parseFullYear(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 4));
  return n ? (d.y = +n[0], i + n[0].length) : -1;
}

function parseYear(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.y = +n[0] + (+n[0] > 68 ? 1900 : 2000), i + n[0].length) : -1;
}

function parseZone(d, string, i) {
  var n = /^(Z)|([+-]\d\d)(?::?(\d\d))?/.exec(string.slice(i, i + 6));
  return n ? (d.Z = n[1] ? 0 : -(n[2] + (n[3] || "00")), i + n[0].length) : -1;
}

function parseQuarter(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 1));
  return n ? (d.q = n[0] * 3 - 3, i + n[0].length) : -1;
}

function parseMonthNumber(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.m = n[0] - 1, i + n[0].length) : -1;
}

function parseDayOfMonth(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.d = +n[0], i + n[0].length) : -1;
}

function parseDayOfYear(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 3));
  return n ? (d.m = 0, d.d = +n[0], i + n[0].length) : -1;
}

function parseHour24(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.H = +n[0], i + n[0].length) : -1;
}

function parseMinutes(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.M = +n[0], i + n[0].length) : -1;
}

function parseSeconds(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.S = +n[0], i + n[0].length) : -1;
}

function parseMilliseconds(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 3));
  return n ? (d.L = +n[0], i + n[0].length) : -1;
}

function parseMicroseconds(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 6));
  return n ? (d.L = Math.floor(n[0] / 1000), i + n[0].length) : -1;
}

function parseLiteralPercent(d, string, i) {
  var n = percentRe.exec(string.slice(i, i + 1));
  return n ? i + n[0].length : -1;
}

function parseUnixTimestamp(d, string, i) {
  var n = numberRe.exec(string.slice(i));
  return n ? (d.Q = +n[0], i + n[0].length) : -1;
}

function parseUnixTimestampSeconds(d, string, i) {
  var n = numberRe.exec(string.slice(i));
  return n ? (d.s = +n[0], i + n[0].length) : -1;
}

function formatDayOfMonth(d, p) {
  return pad$1(d.getDate(), p, 2);
}

function formatHour24(d, p) {
  return pad$1(d.getHours(), p, 2);
}

function formatHour12(d, p) {
  return pad$1(d.getHours() % 12 || 12, p, 2);
}

function formatDayOfYear(d, p) {
  return pad$1(1 + timeDay.count(timeYear(d), d), p, 3);
}

function formatMilliseconds(d, p) {
  return pad$1(d.getMilliseconds(), p, 3);
}

function formatMicroseconds(d, p) {
  return formatMilliseconds(d, p) + "000";
}

function formatMonthNumber(d, p) {
  return pad$1(d.getMonth() + 1, p, 2);
}

function formatMinutes(d, p) {
  return pad$1(d.getMinutes(), p, 2);
}

function formatSeconds(d, p) {
  return pad$1(d.getSeconds(), p, 2);
}

function formatWeekdayNumberMonday(d) {
  var day = d.getDay();
  return day === 0 ? 7 : day;
}

function formatWeekNumberSunday(d, p) {
  return pad$1(timeSunday.count(timeYear(d) - 1, d), p, 2);
}

function dISO(d) {
  var day = d.getDay();
  return (day >= 4 || day === 0) ? timeThursday(d) : timeThursday.ceil(d);
}

function formatWeekNumberISO(d, p) {
  d = dISO(d);
  return pad$1(timeThursday.count(timeYear(d), d) + (timeYear(d).getDay() === 4), p, 2);
}

function formatWeekdayNumberSunday(d) {
  return d.getDay();
}

function formatWeekNumberMonday(d, p) {
  return pad$1(timeMonday.count(timeYear(d) - 1, d), p, 2);
}

function formatYear$1(d, p) {
  return pad$1(d.getFullYear() % 100, p, 2);
}

function formatYearISO(d, p) {
  d = dISO(d);
  return pad$1(d.getFullYear() % 100, p, 2);
}

function formatFullYear(d, p) {
  return pad$1(d.getFullYear() % 10000, p, 4);
}

function formatFullYearISO(d, p) {
  var day = d.getDay();
  d = (day >= 4 || day === 0) ? timeThursday(d) : timeThursday.ceil(d);
  return pad$1(d.getFullYear() % 10000, p, 4);
}

function formatZone(d) {
  var z = d.getTimezoneOffset();
  return (z > 0 ? "-" : (z *= -1, "+"))
      + pad$1(z / 60 | 0, "0", 2)
      + pad$1(z % 60, "0", 2);
}

function formatUTCDayOfMonth(d, p) {
  return pad$1(d.getUTCDate(), p, 2);
}

function formatUTCHour24(d, p) {
  return pad$1(d.getUTCHours(), p, 2);
}

function formatUTCHour12(d, p) {
  return pad$1(d.getUTCHours() % 12 || 12, p, 2);
}

function formatUTCDayOfYear(d, p) {
  return pad$1(1 + utcDay.count(utcYear(d), d), p, 3);
}

function formatUTCMilliseconds(d, p) {
  return pad$1(d.getUTCMilliseconds(), p, 3);
}

function formatUTCMicroseconds(d, p) {
  return formatUTCMilliseconds(d, p) + "000";
}

function formatUTCMonthNumber(d, p) {
  return pad$1(d.getUTCMonth() + 1, p, 2);
}

function formatUTCMinutes(d, p) {
  return pad$1(d.getUTCMinutes(), p, 2);
}

function formatUTCSeconds(d, p) {
  return pad$1(d.getUTCSeconds(), p, 2);
}

function formatUTCWeekdayNumberMonday(d) {
  var dow = d.getUTCDay();
  return dow === 0 ? 7 : dow;
}

function formatUTCWeekNumberSunday(d, p) {
  return pad$1(utcSunday.count(utcYear(d) - 1, d), p, 2);
}

function UTCdISO(d) {
  var day = d.getUTCDay();
  return (day >= 4 || day === 0) ? utcThursday(d) : utcThursday.ceil(d);
}

function formatUTCWeekNumberISO(d, p) {
  d = UTCdISO(d);
  return pad$1(utcThursday.count(utcYear(d), d) + (utcYear(d).getUTCDay() === 4), p, 2);
}

function formatUTCWeekdayNumberSunday(d) {
  return d.getUTCDay();
}

function formatUTCWeekNumberMonday(d, p) {
  return pad$1(utcMonday.count(utcYear(d) - 1, d), p, 2);
}

function formatUTCYear(d, p) {
  return pad$1(d.getUTCFullYear() % 100, p, 2);
}

function formatUTCYearISO(d, p) {
  d = UTCdISO(d);
  return pad$1(d.getUTCFullYear() % 100, p, 2);
}

function formatUTCFullYear(d, p) {
  return pad$1(d.getUTCFullYear() % 10000, p, 4);
}

function formatUTCFullYearISO(d, p) {
  var day = d.getUTCDay();
  d = (day >= 4 || day === 0) ? utcThursday(d) : utcThursday.ceil(d);
  return pad$1(d.getUTCFullYear() % 10000, p, 4);
}

function formatUTCZone() {
  return "+0000";
}

function formatLiteralPercent() {
  return "%";
}

function formatUnixTimestamp(d) {
  return +d;
}

function formatUnixTimestampSeconds(d) {
  return Math.floor(+d / 1000);
}

var locale;
var utcFormat;
var utcParse;

defaultLocale({
  dateTime: "%x, %X",
  date: "%-m/%-d/%Y",
  time: "%-I:%M:%S %p",
  periods: ["AM", "PM"],
  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
});

function defaultLocale(definition) {
  locale = formatLocale(definition);
  locale.format;
  locale.parse;
  utcFormat = locale.utcFormat;
  utcParse = locale.utcParse;
  return locale;
}

var isoSpecifier = "%Y-%m-%dT%H:%M:%S.%LZ";

function formatIsoNative(date) {
  return date.toISOString();
}

Date.prototype.toISOString
    ? formatIsoNative
    : utcFormat(isoSpecifier);

function parseIsoNative(string) {
  var date = new Date(string);
  return isNaN(date) ? null : date;
}

+new Date("2000-01-01T00:00:00.000Z")
    ? parseIsoNative
    : utcParse(isoSpecifier);

function identity(x) {
  return x;
}

var top = 1,
    right = 2,
    bottom = 3,
    left = 4,
    epsilon$2 = 1e-6;

function translateX(x) {
  return "translate(" + x + ",0)";
}

function translateY(y) {
  return "translate(0," + y + ")";
}

function number(scale) {
  return d => +scale(d);
}

function center(scale, offset) {
  offset = Math.max(0, scale.bandwidth() - offset * 2) / 2;
  if (scale.round()) offset = Math.round(offset);
  return d => +scale(d) + offset;
}

function entering() {
  return !this.__axis;
}

function axis(orient, scale) {
  var tickArguments = [],
      tickValues = null,
      tickFormat = null,
      tickSizeInner = 6,
      tickSizeOuter = 6,
      tickPadding = 3,
      offset = typeof window !== "undefined" && window.devicePixelRatio > 1 ? 0 : 0.5,
      k = orient === top || orient === left ? -1 : 1,
      x = orient === left || orient === right ? "x" : "y",
      transform = orient === top || orient === bottom ? translateX : translateY;

  function axis(context) {
    var values = tickValues == null ? (scale.ticks ? scale.ticks.apply(scale, tickArguments) : scale.domain()) : tickValues,
        format = tickFormat == null ? (scale.tickFormat ? scale.tickFormat.apply(scale, tickArguments) : identity) : tickFormat,
        spacing = Math.max(tickSizeInner, 0) + tickPadding,
        range = scale.range(),
        range0 = +range[0] + offset,
        range1 = +range[range.length - 1] + offset,
        position = (scale.bandwidth ? center : number)(scale.copy(), offset),
        selection = context.selection ? context.selection() : context,
        path = selection.selectAll(".domain").data([null]),
        tick = selection.selectAll(".tick").data(values, scale).order(),
        tickExit = tick.exit(),
        tickEnter = tick.enter().append("g").attr("class", "tick"),
        line = tick.select("line"),
        text = tick.select("text");

    path = path.merge(path.enter().insert("path", ".tick")
        .attr("class", "domain")
        .attr("stroke", "currentColor"));

    tick = tick.merge(tickEnter);

    line = line.merge(tickEnter.append("line")
        .attr("stroke", "currentColor")
        .attr(x + "2", k * tickSizeInner));

    text = text.merge(tickEnter.append("text")
        .attr("fill", "currentColor")
        .attr(x, k * spacing)
        .attr("dy", orient === top ? "0em" : orient === bottom ? "0.71em" : "0.32em"));

    if (context !== selection) {
      path = path.transition(context);
      tick = tick.transition(context);
      line = line.transition(context);
      text = text.transition(context);

      tickExit = tickExit.transition(context)
          .attr("opacity", epsilon$2)
          .attr("transform", function(d) { return isFinite(d = position(d)) ? transform(d + offset) : this.getAttribute("transform"); });

      tickEnter
          .attr("opacity", epsilon$2)
          .attr("transform", function(d) { var p = this.parentNode.__axis; return transform((p && isFinite(p = p(d)) ? p : position(d)) + offset); });
    }

    tickExit.remove();

    path
        .attr("d", orient === left || orient === right
            ? (tickSizeOuter ? "M" + k * tickSizeOuter + "," + range0 + "H" + offset + "V" + range1 + "H" + k * tickSizeOuter : "M" + offset + "," + range0 + "V" + range1)
            : (tickSizeOuter ? "M" + range0 + "," + k * tickSizeOuter + "V" + offset + "H" + range1 + "V" + k * tickSizeOuter : "M" + range0 + "," + offset + "H" + range1));

    tick
        .attr("opacity", 1)
        .attr("transform", function(d) { return transform(position(d) + offset); });

    line
        .attr(x + "2", k * tickSizeInner);

    text
        .attr(x, k * spacing)
        .text(format);

    selection.filter(entering)
        .attr("fill", "none")
        .attr("font-size", 10)
        .attr("font-family", "sans-serif")
        .attr("text-anchor", orient === right ? "start" : orient === left ? "end" : "middle");

    selection
        .each(function() { this.__axis = position; });
  }

  axis.scale = function(_) {
    return arguments.length ? (scale = _, axis) : scale;
  };

  axis.ticks = function() {
    return tickArguments = Array.from(arguments), axis;
  };

  axis.tickArguments = function(_) {
    return arguments.length ? (tickArguments = _ == null ? [] : Array.from(_), axis) : tickArguments.slice();
  };

  axis.tickValues = function(_) {
    return arguments.length ? (tickValues = _ == null ? null : Array.from(_), axis) : tickValues && tickValues.slice();
  };

  axis.tickFormat = function(_) {
    return arguments.length ? (tickFormat = _, axis) : tickFormat;
  };

  axis.tickSize = function(_) {
    return arguments.length ? (tickSizeInner = tickSizeOuter = +_, axis) : tickSizeInner;
  };

  axis.tickSizeInner = function(_) {
    return arguments.length ? (tickSizeInner = +_, axis) : tickSizeInner;
  };

  axis.tickSizeOuter = function(_) {
    return arguments.length ? (tickSizeOuter = +_, axis) : tickSizeOuter;
  };

  axis.tickPadding = function(_) {
    return arguments.length ? (tickPadding = +_, axis) : tickPadding;
  };

  axis.offset = function(_) {
    return arguments.length ? (offset = +_, axis) : offset;
  };

  return axis;
}

function axisLeft(scale) {
  return axis(left, scale);
}

function constant(x) {
  return function constant() {
    return x;
  };
}

const epsilon$1 = 1e-12;

const pi = Math.PI,
    tau = 2 * pi,
    epsilon = 1e-6,
    tauEpsilon = tau - epsilon;

function append(strings) {
  this._ += strings[0];
  for (let i = 1, n = strings.length; i < n; ++i) {
    this._ += arguments[i] + strings[i];
  }
}

function appendRound(digits) {
  let d = Math.floor(digits);
  if (!(d >= 0)) throw new Error(`invalid digits: ${digits}`);
  if (d > 15) return append;
  const k = 10 ** d;
  return function(strings) {
    this._ += strings[0];
    for (let i = 1, n = strings.length; i < n; ++i) {
      this._ += Math.round(arguments[i] * k) / k + strings[i];
    }
  };
}

class Path {
  constructor(digits) {
    this._x0 = this._y0 = // start of current subpath
    this._x1 = this._y1 = null; // end of current subpath
    this._ = "";
    this._append = digits == null ? append : appendRound(digits);
  }
  moveTo(x, y) {
    this._append`M${this._x0 = this._x1 = +x},${this._y0 = this._y1 = +y}`;
  }
  closePath() {
    if (this._x1 !== null) {
      this._x1 = this._x0, this._y1 = this._y0;
      this._append`Z`;
    }
  }
  lineTo(x, y) {
    this._append`L${this._x1 = +x},${this._y1 = +y}`;
  }
  quadraticCurveTo(x1, y1, x, y) {
    this._append`Q${+x1},${+y1},${this._x1 = +x},${this._y1 = +y}`;
  }
  bezierCurveTo(x1, y1, x2, y2, x, y) {
    this._append`C${+x1},${+y1},${+x2},${+y2},${this._x1 = +x},${this._y1 = +y}`;
  }
  arcTo(x1, y1, x2, y2, r) {
    x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;

    // Is the radius negative? Error.
    if (r < 0) throw new Error(`negative radius: ${r}`);

    let x0 = this._x1,
        y0 = this._y1,
        x21 = x2 - x1,
        y21 = y2 - y1,
        x01 = x0 - x1,
        y01 = y0 - y1,
        l01_2 = x01 * x01 + y01 * y01;

    // Is this path empty? Move to (x1,y1).
    if (this._x1 === null) {
      this._append`M${this._x1 = x1},${this._y1 = y1}`;
    }

    // Or, is (x1,y1) coincident with (x0,y0)? Do nothing.
    else if (!(l01_2 > epsilon));

    // Or, are (x0,y0), (x1,y1) and (x2,y2) collinear?
    // Equivalently, is (x1,y1) coincident with (x2,y2)?
    // Or, is the radius zero? Line to (x1,y1).
    else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon) || !r) {
      this._append`L${this._x1 = x1},${this._y1 = y1}`;
    }

    // Otherwise, draw an arc!
    else {
      let x20 = x2 - x0,
          y20 = y2 - y0,
          l21_2 = x21 * x21 + y21 * y21,
          l20_2 = x20 * x20 + y20 * y20,
          l21 = Math.sqrt(l21_2),
          l01 = Math.sqrt(l01_2),
          l = r * Math.tan((pi - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2),
          t01 = l / l01,
          t21 = l / l21;

      // If the start tangent is not coincident with (x0,y0), line to.
      if (Math.abs(t01 - 1) > epsilon) {
        this._append`L${x1 + t01 * x01},${y1 + t01 * y01}`;
      }

      this._append`A${r},${r},0,0,${+(y01 * x20 > x01 * y20)},${this._x1 = x1 + t21 * x21},${this._y1 = y1 + t21 * y21}`;
    }
  }
  arc(x, y, r, a0, a1, ccw) {
    x = +x, y = +y, r = +r, ccw = !!ccw;

    // Is the radius negative? Error.
    if (r < 0) throw new Error(`negative radius: ${r}`);

    let dx = r * Math.cos(a0),
        dy = r * Math.sin(a0),
        x0 = x + dx,
        y0 = y + dy,
        cw = 1 ^ ccw,
        da = ccw ? a0 - a1 : a1 - a0;

    // Is this path empty? Move to (x0,y0).
    if (this._x1 === null) {
      this._append`M${x0},${y0}`;
    }

    // Or, is (x0,y0) not coincident with the previous point? Line to (x0,y0).
    else if (Math.abs(this._x1 - x0) > epsilon || Math.abs(this._y1 - y0) > epsilon) {
      this._append`L${x0},${y0}`;
    }

    // Is this arc empty? We’re done.
    if (!r) return;

    // Does the angle go the wrong way? Flip the direction.
    if (da < 0) da = da % tau + tau;

    // Is this a complete circle? Draw two arcs to complete the circle.
    if (da > tauEpsilon) {
      this._append`A${r},${r},0,1,${cw},${x - dx},${y - dy}A${r},${r},0,1,${cw},${this._x1 = x0},${this._y1 = y0}`;
    }

    // Is this arc non-empty? Draw an arc!
    else if (da > epsilon) {
      this._append`A${r},${r},0,${+(da >= pi)},${cw},${this._x1 = x + r * Math.cos(a1)},${this._y1 = y + r * Math.sin(a1)}`;
    }
  }
  rect(x, y, w, h) {
    this._append`M${this._x0 = this._x1 = +x},${this._y0 = this._y1 = +y}h${w = +w}v${+h}h${-w}Z`;
  }
  toString() {
    return this._;
  }
}

function withPath(shape) {
  let digits = 3;

  shape.digits = function(_) {
    if (!arguments.length) return digits;
    if (_ == null) {
      digits = null;
    } else {
      const d = Math.floor(_);
      if (!(d >= 0)) throw new RangeError(`invalid digits: ${_}`);
      digits = d;
    }
    return shape;
  };

  return () => new Path(digits);
}

function array(x) {
  return typeof x === "object" && "length" in x
    ? x // Array, TypedArray, NodeList, array-like
    : Array.from(x); // Map, Set, iterable, string, or anything else
}

function Linear(context) {
  this._context = context;
}

Linear.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._point = 0;
  },
  lineEnd: function() {
    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    x = +x, y = +y;
    switch (this._point) {
      case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
      case 1: this._point = 2; // falls through
      default: this._context.lineTo(x, y); break;
    }
  }
};

function curveLinear(context) {
  return new Linear(context);
}

function x(p) {
  return p[0];
}

function y(p) {
  return p[1];
}

function line(x$1, y$1) {
  var defined = constant(true),
      context = null,
      curve = curveLinear,
      output = null,
      path = withPath(line);

  x$1 = typeof x$1 === "function" ? x$1 : (x$1 === undefined) ? x : constant(x$1);
  y$1 = typeof y$1 === "function" ? y$1 : (y$1 === undefined) ? y : constant(y$1);

  function line(data) {
    var i,
        n = (data = array(data)).length,
        d,
        defined0 = false,
        buffer;

    if (context == null) output = curve(buffer = path());

    for (i = 0; i <= n; ++i) {
      if (!(i < n && defined(d = data[i], i, data)) === defined0) {
        if (defined0 = !defined0) output.lineStart();
        else output.lineEnd();
      }
      if (defined0) output.point(+x$1(d, i, data), +y$1(d, i, data));
    }

    if (buffer) return output = null, buffer + "" || null;
  }

  line.x = function(_) {
    return arguments.length ? (x$1 = typeof _ === "function" ? _ : constant(+_), line) : x$1;
  };

  line.y = function(_) {
    return arguments.length ? (y$1 = typeof _ === "function" ? _ : constant(+_), line) : y$1;
  };

  line.defined = function(_) {
    return arguments.length ? (defined = typeof _ === "function" ? _ : constant(!!_), line) : defined;
  };

  line.curve = function(_) {
    return arguments.length ? (curve = _, context != null && (output = curve(context)), line) : curve;
  };

  line.context = function(_) {
    return arguments.length ? (_ == null ? context = output = null : output = curve(context = _), line) : context;
  };

  return line;
}

function noop() {}

function point$3(that, x, y) {
  that._context.bezierCurveTo(
    (2 * that._x0 + that._x1) / 3,
    (2 * that._y0 + that._y1) / 3,
    (that._x0 + 2 * that._x1) / 3,
    (that._y0 + 2 * that._y1) / 3,
    (that._x0 + 4 * that._x1 + x) / 6,
    (that._y0 + 4 * that._y1 + y) / 6
  );
}

function Basis(context) {
  this._context = context;
}

Basis.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 =
    this._y0 = this._y1 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 3: point$3(this, this._x1, this._y1); // falls through
      case 2: this._context.lineTo(this._x1, this._y1); break;
    }
    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    x = +x, y = +y;
    switch (this._point) {
      case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
      case 1: this._point = 2; break;
      case 2: this._point = 3; this._context.lineTo((5 * this._x0 + this._x1) / 6, (5 * this._y0 + this._y1) / 6); // falls through
      default: point$3(this, x, y); break;
    }
    this._x0 = this._x1, this._x1 = x;
    this._y0 = this._y1, this._y1 = y;
  }
};

function Bundle(context, beta) {
  this._basis = new Basis(context);
  this._beta = beta;
}

Bundle.prototype = {
  lineStart: function() {
    this._x = [];
    this._y = [];
    this._basis.lineStart();
  },
  lineEnd: function() {
    var x = this._x,
        y = this._y,
        j = x.length - 1;

    if (j > 0) {
      var x0 = x[0],
          y0 = y[0],
          dx = x[j] - x0,
          dy = y[j] - y0,
          i = -1,
          t;

      while (++i <= j) {
        t = i / j;
        this._basis.point(
          this._beta * x[i] + (1 - this._beta) * (x0 + t * dx),
          this._beta * y[i] + (1 - this._beta) * (y0 + t * dy)
        );
      }
    }

    this._x = this._y = null;
    this._basis.lineEnd();
  },
  point: function(x, y) {
    this._x.push(+x);
    this._y.push(+y);
  }
};

((function custom(beta) {

  function bundle(context) {
    return beta === 1 ? new Basis(context) : new Bundle(context, beta);
  }

  bundle.beta = function(beta) {
    return custom(+beta);
  };

  return bundle;
}))(0.85);

function point$2(that, x, y) {
  that._context.bezierCurveTo(
    that._x1 + that._k * (that._x2 - that._x0),
    that._y1 + that._k * (that._y2 - that._y0),
    that._x2 + that._k * (that._x1 - x),
    that._y2 + that._k * (that._y1 - y),
    that._x2,
    that._y2
  );
}

function Cardinal(context, tension) {
  this._context = context;
  this._k = (1 - tension) / 6;
}

Cardinal.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 = this._x2 =
    this._y0 = this._y1 = this._y2 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 2: this._context.lineTo(this._x2, this._y2); break;
      case 3: point$2(this, this._x1, this._y1); break;
    }
    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    x = +x, y = +y;
    switch (this._point) {
      case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
      case 1: this._point = 2; this._x1 = x, this._y1 = y; break;
      case 2: this._point = 3; // falls through
      default: point$2(this, x, y); break;
    }
    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
  }
};

((function custom(tension) {

  function cardinal(context) {
    return new Cardinal(context, tension);
  }

  cardinal.tension = function(tension) {
    return custom(+tension);
  };

  return cardinal;
}))(0);

function CardinalClosed(context, tension) {
  this._context = context;
  this._k = (1 - tension) / 6;
}

CardinalClosed.prototype = {
  areaStart: noop,
  areaEnd: noop,
  lineStart: function() {
    this._x0 = this._x1 = this._x2 = this._x3 = this._x4 = this._x5 =
    this._y0 = this._y1 = this._y2 = this._y3 = this._y4 = this._y5 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 1: {
        this._context.moveTo(this._x3, this._y3);
        this._context.closePath();
        break;
      }
      case 2: {
        this._context.lineTo(this._x3, this._y3);
        this._context.closePath();
        break;
      }
      case 3: {
        this.point(this._x3, this._y3);
        this.point(this._x4, this._y4);
        this.point(this._x5, this._y5);
        break;
      }
    }
  },
  point: function(x, y) {
    x = +x, y = +y;
    switch (this._point) {
      case 0: this._point = 1; this._x3 = x, this._y3 = y; break;
      case 1: this._point = 2; this._context.moveTo(this._x4 = x, this._y4 = y); break;
      case 2: this._point = 3; this._x5 = x, this._y5 = y; break;
      default: point$2(this, x, y); break;
    }
    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
  }
};

((function custom(tension) {

  function cardinal(context) {
    return new CardinalClosed(context, tension);
  }

  cardinal.tension = function(tension) {
    return custom(+tension);
  };

  return cardinal;
}))(0);

function CardinalOpen(context, tension) {
  this._context = context;
  this._k = (1 - tension) / 6;
}

CardinalOpen.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 = this._x2 =
    this._y0 = this._y1 = this._y2 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    if (this._line || (this._line !== 0 && this._point === 3)) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    x = +x, y = +y;
    switch (this._point) {
      case 0: this._point = 1; break;
      case 1: this._point = 2; break;
      case 2: this._point = 3; this._line ? this._context.lineTo(this._x2, this._y2) : this._context.moveTo(this._x2, this._y2); break;
      case 3: this._point = 4; // falls through
      default: point$2(this, x, y); break;
    }
    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
  }
};

((function custom(tension) {

  function cardinal(context) {
    return new CardinalOpen(context, tension);
  }

  cardinal.tension = function(tension) {
    return custom(+tension);
  };

  return cardinal;
}))(0);

function point$1(that, x, y) {
  var x1 = that._x1,
      y1 = that._y1,
      x2 = that._x2,
      y2 = that._y2;

  if (that._l01_a > epsilon$1) {
    var a = 2 * that._l01_2a + 3 * that._l01_a * that._l12_a + that._l12_2a,
        n = 3 * that._l01_a * (that._l01_a + that._l12_a);
    x1 = (x1 * a - that._x0 * that._l12_2a + that._x2 * that._l01_2a) / n;
    y1 = (y1 * a - that._y0 * that._l12_2a + that._y2 * that._l01_2a) / n;
  }

  if (that._l23_a > epsilon$1) {
    var b = 2 * that._l23_2a + 3 * that._l23_a * that._l12_a + that._l12_2a,
        m = 3 * that._l23_a * (that._l23_a + that._l12_a);
    x2 = (x2 * b + that._x1 * that._l23_2a - x * that._l12_2a) / m;
    y2 = (y2 * b + that._y1 * that._l23_2a - y * that._l12_2a) / m;
  }

  that._context.bezierCurveTo(x1, y1, x2, y2, that._x2, that._y2);
}

function CatmullRom(context, alpha) {
  this._context = context;
  this._alpha = alpha;
}

CatmullRom.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 = this._x2 =
    this._y0 = this._y1 = this._y2 = NaN;
    this._l01_a = this._l12_a = this._l23_a =
    this._l01_2a = this._l12_2a = this._l23_2a =
    this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 2: this._context.lineTo(this._x2, this._y2); break;
      case 3: this.point(this._x2, this._y2); break;
    }
    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    x = +x, y = +y;

    if (this._point) {
      var x23 = this._x2 - x,
          y23 = this._y2 - y;
      this._l23_a = Math.sqrt(this._l23_2a = Math.pow(x23 * x23 + y23 * y23, this._alpha));
    }

    switch (this._point) {
      case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
      case 1: this._point = 2; break;
      case 2: this._point = 3; // falls through
      default: point$1(this, x, y); break;
    }

    this._l01_a = this._l12_a, this._l12_a = this._l23_a;
    this._l01_2a = this._l12_2a, this._l12_2a = this._l23_2a;
    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
  }
};

((function custom(alpha) {

  function catmullRom(context) {
    return alpha ? new CatmullRom(context, alpha) : new Cardinal(context, 0);
  }

  catmullRom.alpha = function(alpha) {
    return custom(+alpha);
  };

  return catmullRom;
}))(0.5);

function CatmullRomClosed(context, alpha) {
  this._context = context;
  this._alpha = alpha;
}

CatmullRomClosed.prototype = {
  areaStart: noop,
  areaEnd: noop,
  lineStart: function() {
    this._x0 = this._x1 = this._x2 = this._x3 = this._x4 = this._x5 =
    this._y0 = this._y1 = this._y2 = this._y3 = this._y4 = this._y5 = NaN;
    this._l01_a = this._l12_a = this._l23_a =
    this._l01_2a = this._l12_2a = this._l23_2a =
    this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 1: {
        this._context.moveTo(this._x3, this._y3);
        this._context.closePath();
        break;
      }
      case 2: {
        this._context.lineTo(this._x3, this._y3);
        this._context.closePath();
        break;
      }
      case 3: {
        this.point(this._x3, this._y3);
        this.point(this._x4, this._y4);
        this.point(this._x5, this._y5);
        break;
      }
    }
  },
  point: function(x, y) {
    x = +x, y = +y;

    if (this._point) {
      var x23 = this._x2 - x,
          y23 = this._y2 - y;
      this._l23_a = Math.sqrt(this._l23_2a = Math.pow(x23 * x23 + y23 * y23, this._alpha));
    }

    switch (this._point) {
      case 0: this._point = 1; this._x3 = x, this._y3 = y; break;
      case 1: this._point = 2; this._context.moveTo(this._x4 = x, this._y4 = y); break;
      case 2: this._point = 3; this._x5 = x, this._y5 = y; break;
      default: point$1(this, x, y); break;
    }

    this._l01_a = this._l12_a, this._l12_a = this._l23_a;
    this._l01_2a = this._l12_2a, this._l12_2a = this._l23_2a;
    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
  }
};

((function custom(alpha) {

  function catmullRom(context) {
    return alpha ? new CatmullRomClosed(context, alpha) : new CardinalClosed(context, 0);
  }

  catmullRom.alpha = function(alpha) {
    return custom(+alpha);
  };

  return catmullRom;
}))(0.5);

function CatmullRomOpen(context, alpha) {
  this._context = context;
  this._alpha = alpha;
}

CatmullRomOpen.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 = this._x2 =
    this._y0 = this._y1 = this._y2 = NaN;
    this._l01_a = this._l12_a = this._l23_a =
    this._l01_2a = this._l12_2a = this._l23_2a =
    this._point = 0;
  },
  lineEnd: function() {
    if (this._line || (this._line !== 0 && this._point === 3)) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    x = +x, y = +y;

    if (this._point) {
      var x23 = this._x2 - x,
          y23 = this._y2 - y;
      this._l23_a = Math.sqrt(this._l23_2a = Math.pow(x23 * x23 + y23 * y23, this._alpha));
    }

    switch (this._point) {
      case 0: this._point = 1; break;
      case 1: this._point = 2; break;
      case 2: this._point = 3; this._line ? this._context.lineTo(this._x2, this._y2) : this._context.moveTo(this._x2, this._y2); break;
      case 3: this._point = 4; // falls through
      default: point$1(this, x, y); break;
    }

    this._l01_a = this._l12_a, this._l12_a = this._l23_a;
    this._l01_2a = this._l12_2a, this._l12_2a = this._l23_2a;
    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
  }
};

((function custom(alpha) {

  function catmullRom(context) {
    return alpha ? new CatmullRomOpen(context, alpha) : new CardinalOpen(context, 0);
  }

  catmullRom.alpha = function(alpha) {
    return custom(+alpha);
  };

  return catmullRom;
}))(0.5);

function sign(x) {
  return x < 0 ? -1 : 1;
}

// Calculate the slopes of the tangents (Hermite-type interpolation) based on
// the following paper: Steffen, M. 1990. A Simple Method for Monotonic
// Interpolation in One Dimension. Astronomy and Astrophysics, Vol. 239, NO.
// NOV(II), P. 443, 1990.
function slope3(that, x2, y2) {
  var h0 = that._x1 - that._x0,
      h1 = x2 - that._x1,
      s0 = (that._y1 - that._y0) / (h0 || h1 < 0 && -0),
      s1 = (y2 - that._y1) / (h1 || h0 < 0 && -0),
      p = (s0 * h1 + s1 * h0) / (h0 + h1);
  return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
}

// Calculate a one-sided slope.
function slope2(that, t) {
  var h = that._x1 - that._x0;
  return h ? (3 * (that._y1 - that._y0) / h - t) / 2 : t;
}

// According to https://en.wikipedia.org/wiki/Cubic_Hermite_spline#Representations
// "you can express cubic Hermite interpolation in terms of cubic Bézier curves
// with respect to the four values p0, p0 + m0 / 3, p1 - m1 / 3, p1".
function point(that, t0, t1) {
  var x0 = that._x0,
      y0 = that._y0,
      x1 = that._x1,
      y1 = that._y1,
      dx = (x1 - x0) / 3;
  that._context.bezierCurveTo(x0 + dx, y0 + dx * t0, x1 - dx, y1 - dx * t1, x1, y1);
}

function MonotoneX(context) {
  this._context = context;
}

MonotoneX.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 =
    this._y0 = this._y1 =
    this._t0 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 2: this._context.lineTo(this._x1, this._y1); break;
      case 3: point(this, this._t0, slope2(this, this._t0)); break;
    }
    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    var t1 = NaN;

    x = +x, y = +y;
    if (x === this._x1 && y === this._y1) return; // Ignore coincident points.
    switch (this._point) {
      case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
      case 1: this._point = 2; break;
      case 2: this._point = 3; point(this, slope2(this, t1 = slope3(this, x, y)), t1); break;
      default: point(this, this._t0, t1 = slope3(this, x, y)); break;
    }

    this._x0 = this._x1, this._x1 = x;
    this._y0 = this._y1, this._y1 = y;
    this._t0 = t1;
  }
};

(Object.create(MonotoneX.prototype)).point = function(x, y) {
  MonotoneX.prototype.point.call(this, y, x);
};

function prepareData(data, dimensions) {
    let dataset = [];
    data.forEach((item) => {
        let row = {};
        dimensions.forEach((dimension) => {
            row[dimension] = item[dimension];
        });
        dataset.push(row);
    });
    let header = [];
    Object.keys(dataset[0]).forEach(element => header.push({ 'name': element }));
    return [header, dataset];
}
function setupYScales(header, dataset) {
    let yScales = {};
    header.map((x) => {
        const values = dataset.map((o) => o[x.name]);
        let labels = [];
        if (isNaN(values[0]) !== false) {
            values.forEach(function (element) {
                labels.push(element.length > 10 ? element.substr(0, 10) + '...' :
                    element);
            });
            yScales[x.name] = point$4()
                .domain(labels)
                .range([80, height - 80])
                .padding(0.2);
        }
        else {
            const max = Math.max(...dataset.map((o) => o[x.name]));
            const min = Math.min(...dataset.map((o) => o[x.name]));
            if (min === max) {
                const epsilon = min === 0 ? 1 : Math.abs(min) * 0.01;
                yScales[x.name] = linear()
                    .domain([min - epsilon, max + epsilon])
                    .range([height - 80, 80]);
            }
            else {
                yScales[x.name] = linear()
                    .domain([min, max])
                    .range([height - 80, 80]);
            }
        }
    });
    return yScales;
}
function setupXScales(header) {
    const n = header.length;
    const pad = (n <= 2) ? 0 : 0.2;
    return point$4()
        .domain(header.map((x) => x.name))
        .range([width - padding, padding])
        .padding(pad)
        .align(0.5);
}
function isLinearScale(scale) {
    return typeof scale.ticks === 'function';
}
function setupYAxis(yScales, dataset, hiddenDims) {
    const limit = 30;
    const yAxis = {};
    Object.entries(yScales).forEach(([key, scale]) => {
        if (hiddenDims.includes(key))
            return;
        const sample = dataset[0][key];
        const isNumeric = !isNaN(+sample);
        if (!isNumeric) {
            const rawLabels = dataset.map((d) => d[key]);
            const shortenedLabels = rawLabels.map((val) => typeof val === 'string' && val.length > 10 ? val.substr(0, 10) +
                '...' : val);
            const uniqueLabels = Array.from(new Set(shortenedLabels));
            const ticks = uniqueLabels.length > limit
                ? uniqueLabels.filter((_, i) => i % 4 === 0)
                : uniqueLabels;
            yAxis[key] = axisLeft(scale).tickValues(ticks).tickFormat((d) => d);
        }
        else if (isLinearScale(scale)) {
            const ticks = scale.ticks(5).concat(scale.domain());
            const sorted = Array.from(new Set(ticks)).sort((a, b) => a - b);
            if (sorted.length >= 2) {
                const diffStart = sorted[1] - sorted[0];
                if (diffStart < 5) {
                    sorted.splice(1, 1);
                }
                const len = sorted.length;
                const last = sorted[len - 1];
                const secondLast = sorted[len - 2];
                const diffEnd = last - secondLast;
                if (diffEnd < 5) {
                    sorted.splice(len - 2, 1);
                }
            }
            yAxis[key] = axisLeft(scale).tickValues(sorted).tickFormat((d) => d);
        }
    });
    return yAxis;
}
function linePath(d, newFeatures) {
    const lineGenerator = line();
    const tempdata = Object.entries(d).filter(x => x[0]);
    const points = [];
    newFeatures.forEach((newFeature) => {
        const valueEntry = tempdata.find(x => x[0] === newFeature);
        if (valueEntry) {
            const name = newFeature;
            const value = valueEntry[1];
            const x = parcoords.dragging[name] !== undefined
                ? parcoords.dragging[name]
                : parcoords.xScales(name);
            const y = parcoords.yScales[name](value);
            points.push([x, y]);
        }
    });
    return lineGenerator(points);
}
function isInverted(dimension) {
    const invertId = '#dimension_invert_' + cleanString(dimension);
    const element = select(invertId);
    const arrowStatus = element.text();
    return arrowStatus == 'down' ? true : false;
}
function getAllVisibleDimensionNames$1() {
    let listOfDimensions = parcoords.newFeatures.slice();
    return listOfDimensions.reverse();
}
function recordIdOf(rec, fallback) {
    return rec.id ?? rec._id ?? rec.key ?? fallback;
}
function createToolTipForValues(records, recKey) {
    const dimensions = getAllVisibleDimensionNames$1();
    const svg = select('#pc_svg').node();
    const plotG = (document.querySelector('#pc_svg g.plot') ?? svg);
    const ctm = plotG.getScreenCTM();
    if (!ctm)
        return;
    const recordId = recordIdOf(records, String(recKey ?? Math.random()));
    const layer = select('body')
        .selectAll(`div.tip-layer[data-record="${recordId}"]`)
        .data([recordId])
        .join('div')
        .attr('class', 'tip-layer')
        .attr('data-record', recordId)
        .style('position', 'absolute')
        .style('left', '0px')
        .style('top', '0px')
        .style('pointer-events', 'none');
    const data = dimensions
        .filter(dim => isElementVisible(select('#rect_' + cleanString(dim))))
        .map(dim => {
        const yScale = parcoords.yScales[dim];
        const x = parcoords.xScales(dim);
        const y = yScale(records[dim]);
        const pt = svg.createSVGPoint();
        pt.x = x;
        pt.y = y;
        const sp = pt.matrixTransform(ctm);
        return {
            dim,
            pageX: sp.x + window.scrollX + 8,
            pageY: sp.y + window.scrollY + 8,
            text: String(records[dim]),
        };
    });
    const tips = layer
        .selectAll('div.tooltip-div')
        .data(data, (d) => d.dim);
    tips.join(enter => enter.append('div')
        .attr('class', 'tooltip-div')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('font-size', '0.65rem')
        .style('margin', '0.5rem')
        .style('color', 'red')
        .style('background-color', '#d3d3d3ad')
        .style('font-weight', 'bold')
        .style('padding', '0.12rem')
        .style('white-space', 'nowrap')
        .style('z-index', '9999')
        .style('left', d => `${d.pageX}px`)
        .style('top', d => `${d.pageY}px`)
        .text(d => d.text), update => update
        .style('left', d => `${d.pageX}px`)
        .style('top', d => `${d.pageY}px`)
        .text(d => d.text), exit => exit.remove());
}
function getAllPointerEventsData(event) {
    const selection = selectAll(document.elementsFromPoint(event.clientX, event.clientY)).filter('path');
    if (selection == null)
        return;
    const object = selection._groups;
    const data = [];
    for (let i = 0; i < object[0].length; i++) {
        const items = object.map((item) => item[i]);
        const itemsdata = items[0].__data__;
        if (!itemsdata || !itemsdata[hoverlabel])
            continue;
        const text = itemsdata[hoverlabel];
        data.push(text);
    }
    return data;
}
function createTooltipForPathLine(tooltipText, tooltipPath, event) {
    if (!tooltipText || tooltipText.length === 0)
        return;
    const [x, y] = getMouseCoords(event);
    let tempText = tooltipText.toString();
    tempText = tempText.split(',').join('\r\n');
    tooltipPath.text(tempText)
        .style('visibility', 'visible')
        .style('top', y / 16 + 'rem')
        .style('left', x / 16 + 0.5 + 'rem');
    return tooltipPath;
}
function trans(g) {
    return g.transition().duration(50);
}
function position(dimension, dragging, xScales) {
    const value = dragging[dimension];
    return value == null ? xScales(dimension) : value;
}
function cleanTooltip() {
    selectAll('.tooltip-div').remove();
}

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var d3InterpolatePathExports = {};
var d3InterpolatePath = {
  get exports(){ return d3InterpolatePathExports; },
  set exports(v){ d3InterpolatePathExports = v; },
};

(function (module, exports) {
	(function (global, factory) {
	factory(exports) ;
	}(commonjsGlobal, (function (exports) {
	function ownKeys(object, enumerableOnly) {
	  var keys = Object.keys(object);

	  if (Object.getOwnPropertySymbols) {
	    var symbols = Object.getOwnPropertySymbols(object);

	    if (enumerableOnly) {
	      symbols = symbols.filter(function (sym) {
	        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
	      });
	    }

	    keys.push.apply(keys, symbols);
	  }

	  return keys;
	}

	function _objectSpread2(target) {
	  for (var i = 1; i < arguments.length; i++) {
	    var source = arguments[i] != null ? arguments[i] : {};

	    if (i % 2) {
	      ownKeys(Object(source), true).forEach(function (key) {
	        _defineProperty(target, key, source[key]);
	      });
	    } else if (Object.getOwnPropertyDescriptors) {
	      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
	    } else {
	      ownKeys(Object(source)).forEach(function (key) {
	        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
	      });
	    }
	  }

	  return target;
	}

	function _typeof(obj) {
	  "@babel/helpers - typeof";

	  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
	    _typeof = function (obj) {
	      return typeof obj;
	    };
	  } else {
	    _typeof = function (obj) {
	      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
	    };
	  }

	  return _typeof(obj);
	}

	function _defineProperty(obj, key, value) {
	  if (key in obj) {
	    Object.defineProperty(obj, key, {
	      value: value,
	      enumerable: true,
	      configurable: true,
	      writable: true
	    });
	  } else {
	    obj[key] = value;
	  }

	  return obj;
	}

	function _extends() {
	  _extends = Object.assign || function (target) {
	    for (var i = 1; i < arguments.length; i++) {
	      var source = arguments[i];

	      for (var key in source) {
	        if (Object.prototype.hasOwnProperty.call(source, key)) {
	          target[key] = source[key];
	        }
	      }
	    }

	    return target;
	  };

	  return _extends.apply(this, arguments);
	}

	function _unsupportedIterableToArray(o, minLen) {
	  if (!o) return;
	  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
	  var n = Object.prototype.toString.call(o).slice(8, -1);
	  if (n === "Object" && o.constructor) n = o.constructor.name;
	  if (n === "Map" || n === "Set") return Array.from(o);
	  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
	}

	function _arrayLikeToArray(arr, len) {
	  if (len == null || len > arr.length) len = arr.length;

	  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

	  return arr2;
	}

	function _createForOfIteratorHelper(o, allowArrayLike) {
	  var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];

	  if (!it) {
	    if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
	      if (it) o = it;
	      var i = 0;

	      var F = function () {};

	      return {
	        s: F,
	        n: function () {
	          if (i >= o.length) return {
	            done: true
	          };
	          return {
	            done: false,
	            value: o[i++]
	          };
	        },
	        e: function (e) {
	          throw e;
	        },
	        f: F
	      };
	    }

	    throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
	  }

	  var normalCompletion = true,
	      didErr = false,
	      err;
	  return {
	    s: function () {
	      it = it.call(o);
	    },
	    n: function () {
	      var step = it.next();
	      normalCompletion = step.done;
	      return step;
	    },
	    e: function (e) {
	      didErr = true;
	      err = e;
	    },
	    f: function () {
	      try {
	        if (!normalCompletion && it.return != null) it.return();
	      } finally {
	        if (didErr) throw err;
	      }
	    }
	  };
	}

	/**
	 * de Casteljau's algorithm for drawing and splitting bezier curves.
	 * Inspired by https://pomax.github.io/bezierinfo/
	 *
	 * @param {Number[][]} points Array of [x,y] points: [start, control1, control2, ..., end]
	 *   The original segment to split.
	 * @param {Number} t Where to split the curve (value between [0, 1])
	 * @return {Object} An object { left, right } where left is the segment from 0..t and
	 *   right is the segment from t..1.
	 */
	function decasteljau(points, t) {
	  var left = [];
	  var right = [];

	  function decasteljauRecurse(points, t) {
	    if (points.length === 1) {
	      left.push(points[0]);
	      right.push(points[0]);
	    } else {
	      var newPoints = Array(points.length - 1);

	      for (var i = 0; i < newPoints.length; i++) {
	        if (i === 0) {
	          left.push(points[0]);
	        }

	        if (i === newPoints.length - 1) {
	          right.push(points[i + 1]);
	        }

	        newPoints[i] = [(1 - t) * points[i][0] + t * points[i + 1][0], (1 - t) * points[i][1] + t * points[i + 1][1]];
	      }

	      decasteljauRecurse(newPoints, t);
	    }
	  }

	  if (points.length) {
	    decasteljauRecurse(points, t);
	  }

	  return {
	    left: left,
	    right: right.reverse()
	  };
	}
	/**
	 * Convert segments represented as points back into a command object
	 *
	 * @param {Number[][]} points Array of [x,y] points: [start, control1, control2, ..., end]
	 *   Represents a segment
	 * @return {Object} A command object representing the segment.
	 */


	function pointsToCommand(points) {
	  var command = {};

	  if (points.length === 4) {
	    command.x2 = points[2][0];
	    command.y2 = points[2][1];
	  }

	  if (points.length >= 3) {
	    command.x1 = points[1][0];
	    command.y1 = points[1][1];
	  }

	  command.x = points[points.length - 1][0];
	  command.y = points[points.length - 1][1];

	  if (points.length === 4) {
	    // start, control1, control2, end
	    command.type = 'C';
	  } else if (points.length === 3) {
	    // start, control, end
	    command.type = 'Q';
	  } else {
	    // start, end
	    command.type = 'L';
	  }

	  return command;
	}
	/**
	 * Runs de Casteljau's algorithm enough times to produce the desired number of segments.
	 *
	 * @param {Number[][]} points Array of [x,y] points for de Casteljau (the initial segment to split)
	 * @param {Number} segmentCount Number of segments to split the original into
	 * @return {Number[][][]} Array of segments
	 */


	function splitCurveAsPoints(points, segmentCount) {
	  segmentCount = segmentCount || 2;
	  var segments = [];
	  var remainingCurve = points;
	  var tIncrement = 1 / segmentCount; // x-----x-----x-----x
	  // t=  0.33   0.66   1
	  // x-----o-----------x
	  // r=  0.33
	  //       x-----o-----x
	  // r=         0.5  (0.33 / (1 - 0.33))  === tIncrement / (1 - (tIncrement * (i - 1))
	  // x-----x-----x-----x----x
	  // t=  0.25   0.5   0.75  1
	  // x-----o----------------x
	  // r=  0.25
	  //       x-----o----------x
	  // r=         0.33  (0.25 / (1 - 0.25))
	  //             x-----o----x
	  // r=         0.5  (0.25 / (1 - 0.5))

	  for (var i = 0; i < segmentCount - 1; i++) {
	    var tRelative = tIncrement / (1 - tIncrement * i);
	    var split = decasteljau(remainingCurve, tRelative);
	    segments.push(split.left);
	    remainingCurve = split.right;
	  } // last segment is just to the end from the last point


	  segments.push(remainingCurve);
	  return segments;
	}
	/**
	 * Convert command objects to arrays of points, run de Casteljau's algorithm on it
	 * to split into to the desired number of segments.
	 *
	 * @param {Object} commandStart The start command object
	 * @param {Object} commandEnd The end command object
	 * @param {Number} segmentCount The number of segments to create
	 * @return {Object[]} An array of commands representing the segments in sequence
	 */


	function splitCurve(commandStart, commandEnd, segmentCount) {
	  var points = [[commandStart.x, commandStart.y]];

	  if (commandEnd.x1 != null) {
	    points.push([commandEnd.x1, commandEnd.y1]);
	  }

	  if (commandEnd.x2 != null) {
	    points.push([commandEnd.x2, commandEnd.y2]);
	  }

	  points.push([commandEnd.x, commandEnd.y]);
	  return splitCurveAsPoints(points, segmentCount).map(pointsToCommand);
	}

	var commandTokenRegex = /[MLCSTQAHVZmlcstqahv]|-?[\d.e+-]+/g;
	/**
	 * List of params for each command type in a path `d` attribute
	 */

	var typeMap = {
	  M: ['x', 'y'],
	  L: ['x', 'y'],
	  H: ['x'],
	  V: ['y'],
	  C: ['x1', 'y1', 'x2', 'y2', 'x', 'y'],
	  S: ['x2', 'y2', 'x', 'y'],
	  Q: ['x1', 'y1', 'x', 'y'],
	  T: ['x', 'y'],
	  A: ['rx', 'ry', 'xAxisRotation', 'largeArcFlag', 'sweepFlag', 'x', 'y'],
	  Z: []
	}; // Add lower case entries too matching uppercase (e.g. 'm' == 'M')

	Object.keys(typeMap).forEach(function (key) {
	  typeMap[key.toLowerCase()] = typeMap[key];
	});

	function arrayOfLength(length, value) {
	  var array = Array(length);

	  for (var i = 0; i < length; i++) {
	    array[i] = value;
	  }

	  return array;
	}
	/**
	 * Converts a command object to a string to be used in a `d` attribute
	 * @param {Object} command A command object
	 * @return {String} The string for the `d` attribute
	 */


	function commandToString(command) {
	  return "".concat(command.type).concat(typeMap[command.type].map(function (p) {
	    return command[p];
	  }).join(','));
	}
	/**
	 * Converts command A to have the same type as command B.
	 *
	 * e.g., L0,5 -> C0,5,0,5,0,5
	 *
	 * Uses these rules:
	 * x1 <- x
	 * x2 <- x
	 * y1 <- y
	 * y2 <- y
	 * rx <- 0
	 * ry <- 0
	 * xAxisRotation <- read from B
	 * largeArcFlag <- read from B
	 * sweepflag <- read from B
	 *
	 * @param {Object} aCommand Command object from path `d` attribute
	 * @param {Object} bCommand Command object from path `d` attribute to match against
	 * @return {Object} aCommand converted to type of bCommand
	 */


	function convertToSameType(aCommand, bCommand) {
	  var conversionMap = {
	    x1: 'x',
	    y1: 'y',
	    x2: 'x',
	    y2: 'y'
	  };
	  var readFromBKeys = ['xAxisRotation', 'largeArcFlag', 'sweepFlag']; // convert (but ignore M types)

	  if (aCommand.type !== bCommand.type && bCommand.type.toUpperCase() !== 'M') {
	    var aConverted = {};
	    Object.keys(bCommand).forEach(function (bKey) {
	      var bValue = bCommand[bKey]; // first read from the A command

	      var aValue = aCommand[bKey]; // if it is one of these values, read from B no matter what

	      if (aValue === undefined) {
	        if (readFromBKeys.includes(bKey)) {
	          aValue = bValue;
	        } else {
	          // if it wasn't in the A command, see if an equivalent was
	          if (aValue === undefined && conversionMap[bKey]) {
	            aValue = aCommand[conversionMap[bKey]];
	          } // if it doesn't have a converted value, use 0


	          if (aValue === undefined) {
	            aValue = 0;
	          }
	        }
	      }

	      aConverted[bKey] = aValue;
	    }); // update the type to match B

	    aConverted.type = bCommand.type;
	    aCommand = aConverted;
	  }

	  return aCommand;
	}
	/**
	 * Interpolate between command objects commandStart and commandEnd segmentCount times.
	 * If the types are L, Q, or C then the curves are split as per de Casteljau's algorithm.
	 * Otherwise we just copy commandStart segmentCount - 1 times, finally ending with commandEnd.
	 *
	 * @param {Object} commandStart Command object at the beginning of the segment
	 * @param {Object} commandEnd Command object at the end of the segment
	 * @param {Number} segmentCount The number of segments to split this into. If only 1
	 *   Then [commandEnd] is returned.
	 * @return {Object[]} Array of ~segmentCount command objects between commandStart and
	 *   commandEnd. (Can be segmentCount+1 objects if commandStart is type M).
	 */


	function splitSegment(commandStart, commandEnd, segmentCount) {
	  var segments = []; // line, quadratic bezier, or cubic bezier

	  if (commandEnd.type === 'L' || commandEnd.type === 'Q' || commandEnd.type === 'C') {
	    segments = segments.concat(splitCurve(commandStart, commandEnd, segmentCount)); // general case - just copy the same point
	  } else {
	    var copyCommand = _extends({}, commandStart); // convert M to L


	    if (copyCommand.type === 'M') {
	      copyCommand.type = 'L';
	    }

	    segments = segments.concat(arrayOfLength(segmentCount - 1).map(function () {
	      return copyCommand;
	    }));
	    segments.push(commandEnd);
	  }

	  return segments;
	}
	/**
	 * Extends an array of commandsToExtend to the length of the referenceCommands by
	 * splitting segments until the number of commands match. Ensures all the actual
	 * points of commandsToExtend are in the extended array.
	 *
	 * @param {Object[]} commandsToExtend The command object array to extend
	 * @param {Object[]} referenceCommands The command object array to match in length
	 * @param {Function} excludeSegment a function that takes a start command object and
	 *   end command object and returns true if the segment should be excluded from splitting.
	 * @return {Object[]} The extended commandsToExtend array
	 */


	function extend(commandsToExtend, referenceCommands, excludeSegment) {
	  // compute insertion points:
	  // number of segments in the path to extend
	  var numSegmentsToExtend = commandsToExtend.length - 1; // number of segments in the reference path.

	  var numReferenceSegments = referenceCommands.length - 1; // this value is always between [0, 1].

	  var segmentRatio = numSegmentsToExtend / numReferenceSegments; // create a map, mapping segments in referenceCommands to how many points
	  // should be added in that segment (should always be >= 1 since we need each
	  // point itself).
	  // 0 = segment 0-1, 1 = segment 1-2, n-1 = last vertex

	  var countPointsPerSegment = arrayOfLength(numReferenceSegments).reduce(function (accum, d, i) {
	    var insertIndex = Math.floor(segmentRatio * i); // handle excluding segments

	    if (excludeSegment && insertIndex < commandsToExtend.length - 1 && excludeSegment(commandsToExtend[insertIndex], commandsToExtend[insertIndex + 1])) {
	      // set the insertIndex to the segment that this point should be added to:
	      // round the insertIndex essentially so we split half and half on
	      // neighbouring segments. hence the segmentRatio * i < 0.5
	      var addToPriorSegment = segmentRatio * i % 1 < 0.5; // only skip segment if we already have 1 point in it (can't entirely remove a segment)

	      if (accum[insertIndex]) {
	        // TODO - Note this is a naive algorithm that should work for most d3-area use cases
	        // but if two adjacent segments are supposed to be skipped, this will not perform as
	        // expected. Could be updated to search for nearest segment to place the point in, but
	        // will only do that if necessary.
	        // add to the prior segment
	        if (addToPriorSegment) {
	          if (insertIndex > 0) {
	            insertIndex -= 1; // not possible to add to previous so adding to next
	          } else if (insertIndex < commandsToExtend.length - 1) {
	            insertIndex += 1;
	          } // add to next segment

	        } else if (insertIndex < commandsToExtend.length - 1) {
	          insertIndex += 1; // not possible to add to next so adding to previous
	        } else if (insertIndex > 0) {
	          insertIndex -= 1;
	        }
	      }
	    }

	    accum[insertIndex] = (accum[insertIndex] || 0) + 1;
	    return accum;
	  }, []); // extend each segment to have the correct number of points for a smooth interpolation

	  var extended = countPointsPerSegment.reduce(function (extended, segmentCount, i) {
	    // if last command, just add `segmentCount` number of times
	    if (i === commandsToExtend.length - 1) {
	      var lastCommandCopies = arrayOfLength(segmentCount, _extends({}, commandsToExtend[commandsToExtend.length - 1])); // convert M to L

	      if (lastCommandCopies[0].type === 'M') {
	        lastCommandCopies.forEach(function (d) {
	          d.type = 'L';
	        });
	      }

	      return extended.concat(lastCommandCopies);
	    } // otherwise, split the segment segmentCount times.


	    return extended.concat(splitSegment(commandsToExtend[i], commandsToExtend[i + 1], segmentCount));
	  }, []); // add in the very first point since splitSegment only adds in the ones after it

	  extended.unshift(commandsToExtend[0]);
	  return extended;
	}
	/**
	 * Takes a path `d` string and converts it into an array of command
	 * objects. Drops the `Z` character.
	 *
	 * @param {String|null} d A path `d` string
	 */


	function pathCommandsFromString(d) {
	  // split into valid tokens
	  var tokens = (d || '').match(commandTokenRegex) || [];
	  var commands = [];
	  var commandArgs;
	  var command; // iterate over each token, checking if we are at a new command
	  // by presence in the typeMap

	  for (var i = 0; i < tokens.length; ++i) {
	    commandArgs = typeMap[tokens[i]]; // new command found:

	    if (commandArgs) {
	      command = {
	        type: tokens[i]
	      }; // add each of the expected args for this command:

	      for (var a = 0; a < commandArgs.length; ++a) {
	        command[commandArgs[a]] = +tokens[i + a + 1];
	      } // need to increment our token index appropriately since
	      // we consumed token args


	      i += commandArgs.length;
	      commands.push(command);
	    }
	  }

	  return commands;
	}
	/**
	 * Interpolate from A to B by extending A and B during interpolation to have
	 * the same number of points. This allows for a smooth transition when they
	 * have a different number of points.
	 *
	 * Ignores the `Z` command in paths unless both A and B end with it.
	 *
	 * This function works directly with arrays of command objects instead of with
	 * path `d` strings (see interpolatePath for working with `d` strings).
	 *
	 * @param {Object[]} aCommandsInput Array of path commands
	 * @param {Object[]} bCommandsInput Array of path commands
	 * @param {(Function|Object)} interpolateOptions
	 * @param {Function} interpolateOptions.excludeSegment a function that takes a start command object and
	 *   end command object and returns true if the segment should be excluded from splitting.
	 * @param {Boolean} interpolateOptions.snapEndsToInput a boolean indicating whether end of input should
	 *   be sourced from input argument or computed.
	 * @returns {Function} Interpolation function that maps t ([0, 1]) to an array of path commands.
	 */

	function interpolatePathCommands(aCommandsInput, bCommandsInput, interpolateOptions) {
	  // make a copy so we don't mess with the input arrays
	  var aCommands = aCommandsInput == null ? [] : aCommandsInput.slice();
	  var bCommands = bCommandsInput == null ? [] : bCommandsInput.slice();

	  var _ref = _typeof(interpolateOptions) === 'object' ? interpolateOptions : {
	    excludeSegment: interpolateOptions,
	    snapEndsToInput: true
	  },
	      excludeSegment = _ref.excludeSegment,
	      snapEndsToInput = _ref.snapEndsToInput; // both input sets are empty, so we don't interpolate


	  if (!aCommands.length && !bCommands.length) {
	    return function nullInterpolator() {
	      return [];
	    };
	  } // do we add Z during interpolation? yes if both have it. (we'd expect both to have it or not)


	  var addZ = (aCommands.length === 0 || aCommands[aCommands.length - 1].type === 'Z') && (bCommands.length === 0 || bCommands[bCommands.length - 1].type === 'Z'); // we temporarily remove Z

	  if (aCommands.length > 0 && aCommands[aCommands.length - 1].type === 'Z') {
	    aCommands.pop();
	  }

	  if (bCommands.length > 0 && bCommands[bCommands.length - 1].type === 'Z') {
	    bCommands.pop();
	  } // if A is empty, treat it as if it used to contain just the first point
	  // of B. This makes it so the line extends out of from that first point.


	  if (!aCommands.length) {
	    aCommands.push(bCommands[0]); // otherwise if B is empty, treat it as if it contains the first point
	    // of A. This makes it so the line retracts into the first point.
	  } else if (!bCommands.length) {
	    bCommands.push(aCommands[0]);
	  } // extend to match equal size


	  var numPointsToExtend = Math.abs(bCommands.length - aCommands.length);

	  if (numPointsToExtend !== 0) {
	    // B has more points than A, so add points to A before interpolating
	    if (bCommands.length > aCommands.length) {
	      aCommands = extend(aCommands, bCommands, excludeSegment); // else if A has more points than B, add more points to B
	    } else if (bCommands.length < aCommands.length) {
	      bCommands = extend(bCommands, aCommands, excludeSegment);
	    }
	  } // commands have same length now.
	  // convert commands in A to the same type as those in B


	  aCommands = aCommands.map(function (aCommand, i) {
	    return convertToSameType(aCommand, bCommands[i]);
	  }); // create mutable interpolated command objects

	  var interpolatedCommands = aCommands.map(function (aCommand) {
	    return _objectSpread2({}, aCommand);
	  });

	  if (addZ) {
	    interpolatedCommands.push({
	      type: 'Z'
	    });
	    aCommands.push({
	      type: 'Z'
	    }); // required for when returning at t == 0
	  }

	  return function pathCommandInterpolator(t) {
	    // at 1 return the final value without the extensions used during interpolation
	    if (t === 1 && snapEndsToInput) {
	      return bCommandsInput == null ? [] : bCommandsInput;
	    } // work with aCommands directly since interpolatedCommands are mutated


	    if (t === 0) {
	      return aCommands;
	    } // interpolate the commands using the mutable interpolated command objs


	    for (var i = 0; i < interpolatedCommands.length; ++i) {
	      // if (interpolatedCommands[i].type === 'Z') continue;
	      var aCommand = aCommands[i];
	      var bCommand = bCommands[i];
	      var interpolatedCommand = interpolatedCommands[i];

	      var _iterator = _createForOfIteratorHelper(typeMap[interpolatedCommand.type]),
	          _step;

	      try {
	        for (_iterator.s(); !(_step = _iterator.n()).done;) {
	          var arg = _step.value;
	          interpolatedCommand[arg] = (1 - t) * aCommand[arg] + t * bCommand[arg]; // do not use floats for flags (#27), round to integer

	          if (arg === 'largeArcFlag' || arg === 'sweepFlag') {
	            interpolatedCommand[arg] = Math.round(interpolatedCommand[arg]);
	          }
	        }
	      } catch (err) {
	        _iterator.e(err);
	      } finally {
	        _iterator.f();
	      }
	    }

	    return interpolatedCommands;
	  };
	}
	/** @typedef InterpolateOptions  */

	/**
	 * Interpolate from A to B by extending A and B during interpolation to have
	 * the same number of points. This allows for a smooth transition when they
	 * have a different number of points.
	 *
	 * Ignores the `Z` character in paths unless both A and B end with it.
	 *
	 * @param {String} a The `d` attribute for a path
	 * @param {String} b The `d` attribute for a path
	 * @param {((command1, command2) => boolean|{
	 *   excludeSegment?: (command1, command2) => boolean;
	 *   snapEndsToInput?: boolean
	 * })} interpolateOptions The excludeSegment function or an options object
	 *    - interpolateOptions.excludeSegment a function that takes a start command object and
	 *      end command object and returns true if the segment should be excluded from splitting.
	 *    - interpolateOptions.snapEndsToInput a boolean indicating whether end of input should
	 *      be sourced from input argument or computed.
	 * @returns {Function} Interpolation function that maps t ([0, 1]) to a path `d` string.
	 */

	function interpolatePath(a, b, interpolateOptions) {
	  var aCommands = pathCommandsFromString(a);
	  var bCommands = pathCommandsFromString(b);

	  var _ref2 = _typeof(interpolateOptions) === 'object' ? interpolateOptions : {
	    excludeSegment: interpolateOptions,
	    snapEndsToInput: true
	  },
	      excludeSegment = _ref2.excludeSegment,
	      snapEndsToInput = _ref2.snapEndsToInput;

	  if (!aCommands.length && !bCommands.length) {
	    return function nullInterpolator() {
	      return '';
	    };
	  }

	  var commandInterpolator = interpolatePathCommands(aCommands, bCommands, {
	    excludeSegment: excludeSegment,
	    snapEndsToInput: snapEndsToInput
	  });
	  return function pathStringInterpolator(t) {
	    // at 1 return the final value without the extensions used during interpolation
	    if (t === 1 && snapEndsToInput) {
	      return b == null ? '' : b;
	    }

	    var interpolatedCommands = commandInterpolator(t); // convert to a string (fastest concat: https://jsperf.com/join-concat/150)

	    var interpolatedString = '';

	    var _iterator2 = _createForOfIteratorHelper(interpolatedCommands),
	        _step2;

	    try {
	      for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
	        var interpolatedCommand = _step2.value;
	        interpolatedString += commandToString(interpolatedCommand);
	      }
	    } catch (err) {
	      _iterator2.e(err);
	    } finally {
	      _iterator2.f();
	    }

	    return interpolatedString;
	  };
	}

	exports.interpolatePath = interpolatePath;
	exports.interpolatePathCommands = interpolatePathCommands;
	exports.pathCommandsFromString = pathCommandsFromString;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));
} (d3InterpolatePath, d3InterpolatePathExports));

//---------- Show and Hide Functions ----------
function hide(dimension) {
    const newDimensions = parcoords.newFeatures.filter((d) => d !== dimension);
    const featureSet = parcoords.features.filter((d) => d.name !== dimension);
    parcoords.features = featureSet;
    parcoords.newFeatures = newDimensions;
    const oldxScales = parcoords.xScales.copy();
    parcoords.xScales.domain(newDimensions);
    selectAll(".dimensions")
        .filter((d) => newDimensions.includes(d.name || d))
        .transition()
        .duration(1500)
        .attr("transform", (d) => "translate(" +
        position(d.name || d, parcoords.dragging, parcoords.xScales) +
        ")");
    selectAll(".dimensions")
        .filter((d) => d.name === dimension)
        .transition()
        .duration(1500)
        .style("opacity", 0)
        .on("end", function () {
        select(this).attr("visibility", "hidden");
    });
    select("g.active")
        .selectAll("path")
        .transition()
        .duration(1500)
        .attrTween("d", (d) => generateLineTween(oldxScales, parcoords.xScales, newDimensions, parcoords.yScales)(d));
}
function generateLineTween(oldXscales, newXscales, newDimensions, yScales) {
    const path = line().defined((d) => d != null);
    return function (d) {
        const oldPoints = newDimensions.map((dim) => [
            oldXscales(dim),
            yScales[dim](d[dim]),
        ]);
        const newPoints = newDimensions.map((dim) => [
            newXscales(dim),
            yScales[dim](d[dim]),
        ]);
        return d3InterpolatePathExports.interpolatePath(path(oldPoints), path(newPoints));
    };
}
function show(dimension) {
    if (parcoords.newFeatures.includes(dimension))
        return;
    const existingIndex = initDimension.indexOf(dimension);
    if (existingIndex !== -1) {
        parcoords.newFeatures.splice(existingIndex, 0, dimension);
        const removedItem = { name: dimension };
        parcoords.features.splice(existingIndex, 0, removedItem);
    }
    parcoords.xScales.domain(parcoords.newFeatures);
    selectAll(".dimensions")
        .filter((d) => (typeof d === "object" ? d.name : d) === dimension)
        .style("opacity", 0)
        .transition()
        .attr("visibility", "visible")
        .duration(1500)
        .style("opacity", 1);
    selectAll(".dimensions")
        .filter((d) => parcoords.newFeatures.includes(typeof d === "object" ? d.name : d))
        .transition()
        .duration(1500)
        .attr("transform", (d) => "translate(" +
        position(d.name || d, parcoords.dragging, parcoords.xScales) +
        ")")
        .style("opacity", 1);
    select("g.active")
        .selectAll("path")
        .attr("d", function (d) {
        const points = parcoords.newFeatures.map((p) => {
            const x = parcoords.xScales(p);
            const y = parcoords.yScales[p](d[p]);
            return [x, y];
        });
        return line()(points);
    });
}
function getAllDatasetOptions() {
    return ["default", "100", "1000", "10000", "100000"];
}
function getCurrentDataset() {
    return currDataset;
}
function setNewBenchmarkData(newBenchmarkData) {
    setBenchmarkData(newBenchmarkData);
}
function getBenchmarkData() {
    return benchmarkData;
}
function setCurrentDataset(newDataset) {
}
function getAllWebTechOptions() {
    return ["Canvas2D", "SVG-DOM", "WebGL", "WebGPU"];
}
function getCurrentWebTechnologie() {
    return currWebTech;
}
function setCurrentWebTechnologie(webTech) {
    setCurrentWebTech(webTech);
}
function getAllRecords() {
    const selection = active;
    const object = selection._groups;
    const data = [];
    for (let i = 0; i < object[0].length; i++) {
        const items = object.map((item) => item[i]);
        const keys = Object.keys(items);
        const text = items[keys[0]].id;
        data.push(text);
    }
    return data;
}
function getAllVisibleDimensionNames() {
    let listOfDimensions = parcoords.newFeatures.slice();
    return listOfDimensions.reverse();
}
function getAllDimensionNames() {
    return parcoords.data["columns"];
}
function getAllHiddenDimensionNames() {
    const dimensions = getAllDimensionNames();
    const hiddenDimensions = [];
    for (let i = 0; i < dimensions.length; i++) {
        if (getHiddenStatus(dimensions[i]) == "hidden") {
            hiddenDimensions.push(dimensions[i]);
        }
    }
    return hiddenDimensions;
}
function getHiddenStatus(dimension) {
    const index = parcoords.newFeatures.indexOf(dimension);
    if (index != -1) {
        return "shown";
    }
    else {
        return "hidden";
    }
}
function getInversionStatus(dimension) {
    const invertId = "#dimension_invert_" + cleanString(dimension);
    const element = select(invertId);
    const arrowStatus = element.text();
    return arrowStatus == "up" ? "ascending" : "descending";
}
function getNumberOfDimensions() {
    return parcoords.newFeatures.length;
}
function getDimensionPosition(dimension) {
    return parcoords.newFeatures.indexOf(dimension);
}
function isDimensionCategorical(dimension) {
    let values = parcoords.newDataset.map((o) => o[dimension]);
    if (isNaN(values[0])) {
        return true;
    }
    return false;
}
//---------- Filter Functions ----------
function getFilter(dimension) {
    const yScale = parcoords.yScales[dimension];
    const dimensionSettings = parcoords.currentPosOfDims.find((d) => d.key === dimension);
    if (!dimensionSettings || !yScale || typeof yScale.invert !== "function")
        return [0, 0];
    const valueTop = Math.round(yScale.invert(dimensionSettings.top));
    const valueBottom = Math.round(yScale.invert(dimensionSettings.bottom));
    const min = Math.min(valueTop, valueBottom);
    const max = Math.max(valueTop, valueBottom);
    return [min, max];
}
function setFilter(dimension, min, max) {
    const filterTop = Math.max(min, max);
    const filterBottom = Math.min(min, max);
    addRange$1(filterBottom, parcoords.currentPosOfDims, dimension, "currentFilterBottom");
    addRange$1(filterTop, parcoords.currentPosOfDims, dimension, "currentFilterTop");
    filter(dimension, min, max);
}
//---------- Range Functions ----------
function getDimensionRange(dimension) {
    return parcoords.yScales[dimension].domain();
}
function setDimensionRange(dimension, min, max) {
    const inverted = isInverted(dimension);
    const hiddenDims = getAllHiddenDimensionNames();
    if (inverted) {
        parcoords.yScales[dimension].domain([max, min]);
        setYaxis(setupYAxis(parcoords.yScales, parcoords.newDataset, hiddenDims));
    }
    else {
        parcoords.yScales[dimension].domain([min, max]);
        setYaxis(setupYAxis(parcoords.yScales, parcoords.newDataset, hiddenDims));
    }
    addRange$1(min, parcoords.currentPosOfDims, dimension, "currentRangeBottom");
    addRange$1(max, parcoords.currentPosOfDims, dimension, "currentRangeTop");
    select("#dimension_axis_" + cleanString(dimension))
        .call(yAxis[dimension])
        .transition()
        .duration(1000)
        .ease(cubicInOut);
    let active = select("g.active")
        .selectAll("path")
        .transition()
        .duration(1000)
        .attr("d", (d) => {
        return linePath(d, parcoords.newFeatures);
    })
        .ease(cubicInOut);
    active.each(function (d) {
        select(this)
            .transition()
            .duration(1000)
            .attr("d", linePath(d, parcoords.newFeatures))
            .ease(cubicInOut);
    });
    setFilterAfterSettingRanges(dimension, inverted);
}
function setFilterAfterSettingRanges(dimension, inverted) {
    const rect = select("#rect_" + dimension);
    const triDown = select("#triangle_down_" + dimension);
    const triUp = select("#triangle_up_" + dimension);
    const dimensionSettings = parcoords.currentPosOfDims.find((d) => d.key === dimension);
    const yScale = parcoords.yScales[dimension];
    const newMin = Math.max(dimensionSettings.currentRangeBottom, dimensionSettings.currentFilterBottom);
    const newMax = Math.min(dimensionSettings.currentRangeTop, dimensionSettings.currentFilterTop);
    let top = yScale(newMax);
    let bottom = yScale(newMin);
    if (inverted) {
        [top, bottom] = [bottom, top];
    }
    const rectY = Math.min(top, bottom);
    const rectH = Math.abs(bottom - top);
    const storeBottom = Math.min(newMin, newMax);
    const storeTop = Math.max(newMin, newMax);
    addRange$1(storeBottom, parcoords.currentPosOfDims, dimension, "currentFilterBottom");
    addRange$1(storeTop, parcoords.currentPosOfDims, dimension, "currentFilterTop");
    rect
        .transition()
        .duration(300)
        .attr("y", rectY)
        .attr("height", rectH)
        .style("opacity", 0.3);
    triDown
        .transition()
        .duration(300)
        .attr("y", rectY - 10);
    triUp
        .transition()
        .duration(300)
        .attr("y", rectY + rectH);
}
function setDimensionRangeRounded(dimension, min, max) {
    const inverted = isInverted(dimension);
    const hiddenDims = getAllHiddenDimensionNames();
    if (inverted) {
        parcoords.yScales[dimension].domain([max, min]).nice();
        setYaxis(setupYAxis(parcoords.yScales, parcoords.newDataset, hiddenDims));
    }
    else {
        parcoords.yScales[dimension].domain([min, max]).nice();
        setYaxis(setupYAxis(parcoords.yScales, parcoords.newDataset, hiddenDims));
    }
    const roundedRanges = parcoords.yScales[dimension].domain();
    addRange$1(roundedRanges[0], parcoords.currentPosOfDims, dimension, "currentRangeBottom");
    addRange$1(roundedRanges[1], parcoords.currentPosOfDims, dimension, "currentRangeTop");
    select("#dimension_axis_" + cleanString(dimension))
        .call(yAxis[dimension])
        .transition()
        .duration(1000)
        .ease(cubicInOut);
    let active = select("g.active")
        .selectAll("path")
        .transition()
        .duration(1000)
        .attr("d", (d) => {
        return linePath(d, parcoords.newFeatures);
    })
        .ease(cubicInOut);
    active.each(function (d) {
        select(this)
            .transition()
            .duration(1000)
            .attr("d", linePath(d, parcoords.newFeatures))
            .ease(cubicInOut);
    });
    setFilterAfterSettingRanges(dimension, inverted);
}
function addRange$1(value, currentPosOfDims, dimension, key) {
    let newObject = {};
    newObject[key] = Number(value);
    const target = currentPosOfDims.find((obj) => obj.key == dimension);
    Object.assign(target, newObject);
}
function getMinValue(dimension) {
    const item = parcoords.currentPosOfDims.find((object) => object.key == dimension);
    return item.min;
}
function getMaxValue(dimension) {
    const item = parcoords.currentPosOfDims.find((object) => object.key == dimension);
    return item.max;
}
function getCurrentMinRange(dimension) {
    const item = parcoords.currentPosOfDims.find((object) => object.key == dimension);
    return item.currentRangeBottom;
}
function getCurrentMaxRange(dimension) {
    const item = parcoords.currentPosOfDims.find((object) => object.key == dimension);
    return item.currentRangeTop;
}
function isSelected(record) {
    return select("#" + cleanString(record)).classed("selected");
}
function setDimensionForHovering(dimension) {
    setHoverLabel(dimension);
}
function invert(dimension) {
    const cleanDimensionName = cleanString(dimension);
    const invertId = "#dimension_invert_" + cleanDimensionName;
    const dimensionId = "#dimension_axis_" + cleanDimensionName;
    const textElement = select(invertId);
    const currentArrowStatus = textElement.text();
    const arrow = currentArrowStatus === "down" ? "#arrow_image_up" : "#arrow_image_down";
    const arrowStyle = currentArrowStatus === "down"
        ? setSize(getArrowDownCursor(), 12)
        : setSize(getArrowUpCursor(), 12);
    textElement.text(currentArrowStatus === "down" ? "up" : "down");
    textElement.attr("href", arrow);
    textElement.style("cursor", `url('data:image/svg+xml,${encodeURIComponent(arrowStyle)}') 8 8 , auto`);
    select("#invert_hitbox_" + cleanDimensionName).style("cursor", `url('data:image/svg+xml,${encodeURIComponent(arrowStyle)}') 8 8 , auto`);
    select(dimensionId)
        .transition()
        .duration(1000)
        .call(yAxis[dimension].scale(parcoords.yScales[dimension].domain(parcoords.yScales[dimension].domain().reverse())))
        .ease(cubicInOut);
    trans(active).each(function (d) {
        select(this)
            .transition()
            .duration(1000)
            .attr("d", (d) => {
            return linePath(d, parcoords.newFeatures);
        })
            .ease(cubicInOut);
    });
    getFilter(dimension);
    addSettingsForBrushing(dimension, isInverted(dimension));
    if (isInverted(dimension)) {
        addInvertStatus(true, dimension, "isInverted");
    }
    else {
        addInvertStatus(false, dimension, "isInverted");
    }
}

function brushDown(cleanDimensionName, event, d, tooltipValues, window) {
    const yPosBottom = Number(select('#triangle_up_' + cleanDimensionName).attr('y'));
    let yPosTop;
    let yPosRect;
    if (event.y < 70) {
        yPosTop = 70;
        yPosRect = 80;
    }
    else if (event.y > yPosBottom - 10) {
        yPosTop = yPosBottom - 10;
        yPosRect = 320;
    }
    else if (event.y == yPosBottom - 10) {
        yPosTop = yPosBottom - 10;
        yPosRect = yPosTop + 10;
    }
    else {
        yPosTop = event.y;
        event.y;
        yPosRect = event.y + 10;
    }
    addPosition(yPosRect, d.name, 'top');
    if (yPosTop == 70 && yPosBottom == 320) {
        select('#rect_' + cleanDimensionName)
            .style('cursor', 'default');
    }
    else {
        select('#rect_' + cleanDimensionName)
            .style('cursor', `url('data:image/svg+xml,${setSize(encodeURIComponent(getArrowTopAndBottom()), 20)}') 8 8, auto`);
    }
    if (yPosTop == 70) {
        select('#triangle_down_' + cleanDimensionName)
            .attr('href', '#brush_image_bottom');
        select('#rect_' + cleanDimensionName)
            .attr('fill', 'rgb(242, 242, 76)')
            .attr('opacity', '0.5');
    }
    else {
        select('#triangle_down_' + cleanDimensionName)
            .attr('href', '#brush_image_bottom_active');
        select('#rect_' + cleanDimensionName)
            .attr('fill', 'rgb(255, 255, 0)')
            .attr('opacity', '0.7');
    }
    select('#triangle_down_' + cleanDimensionName).attr('y', yPosTop);
    select('#triangle_down_hit' + cleanDimensionName).attr('y', yPosTop);
    const heightTopRect = yPosRect - 80;
    const heightBottomRect = 320 - yPosBottom;
    select('#rect_' + cleanDimensionName)
        .attr('y', yPosRect)
        .attr('height', 240 - heightTopRect - heightBottomRect);
    if (!isNaN(parcoords.yScales[d.name].domain()[0])) {
        setToolTipBrush(tooltipValues, d, event, window, true);
    }
    if (currWebTech === "SVG-DOM") {
        updateLines(d.name, cleanDimensionName);
    }
    else {
        updateCanvasLines(d.name, cleanDimensionName);
    }
}
function brushUp(cleanDimensionName, event, d, tooltipValues, window) {
    const yPosTop = Number(select('#triangle_down_' + cleanDimensionName).attr('y'));
    let yPosBottom;
    if (event.y < yPosTop + 10) {
        yPosBottom = yPosTop + 10;
    }
    else if (event.y > 320) {
        yPosBottom = 320;
    }
    else if (event.y == yPosTop + 10) {
        yPosBottom = yPosTop;
    }
    else {
        yPosBottom = event.y;
    }
    addPosition(yPosBottom, d.name, 'bottom');
    if (yPosTop == 70 && yPosBottom == 320) {
        select('#rect_' + cleanDimensionName)
            .attr('href', '#brush_image_top_active')
            .style('cursor', 'default');
        select('#rect_' + cleanDimensionName)
            .attr('fill', 'rgb(234, 234, 40)')
            .attr('opacity', '0.5');
    }
    else {
        select('#rect_' + cleanDimensionName)
            .attr('href', '#brush_image_top_active')
            .style('cursor', `url('data:image/svg+xml,${setSize(encodeURIComponent(getArrowTopAndBottom()), 20)}') 8 8, auto`);
        select('#rect_' + cleanDimensionName)
            .attr('fill', 'rgb(255, 255, 0)')
            .attr('opacity', '0.7');
    }
    if (yPosBottom == 320) {
        select('#triangle_up_' + cleanDimensionName)
            .attr('href', '#brush_image_top');
    }
    else {
        select('#triangle_up_' + cleanDimensionName)
            .attr('href', '#brush_image_top_active');
    }
    select('#triangle_up_' + cleanDimensionName).attr('y', yPosBottom);
    select('#triangle_up_hit' + cleanDimensionName).attr('y', yPosBottom);
    const heightTopRect = yPosTop - 70;
    const heightBottomRect = 320 - yPosBottom;
    select('#rect_' + cleanDimensionName)
        .attr('height', 240 - heightTopRect - heightBottomRect);
    if (!isNaN(parcoords.yScales[d.name].domain()[0])) {
        setToolTipBrush(tooltipValues, d, event, window, false);
    }
    if (currWebTech === "SVG-DOM") {
        updateLines(d.name, cleanDimensionName);
    }
    else {
        updateCanvasLines(d.name, cleanDimensionName);
    }
}
function dragAndBrush(cleanDimensionName, d, event, delta, tooltipValuesTop, tooltipValuesDown, window) {
    let yPosTop;
    let yPosRect;
    const yPosBottom = select('#triangle_up_' + cleanDimensionName).attr('y');
    const yPosTopNew = select('#triangle_down_' + cleanDimensionName).attr('y');
    const heightTopRect = yPosTopNew - 70;
    const heightBottomRect = 320 - yPosBottom;
    const rectHeight = 240 - heightTopRect - heightBottomRect;
    if (event.y + delta - 10 <= 70) {
        yPosTop = 70;
        yPosRect = 80;
    }
    else if (event.y + delta + rectHeight >= 320) {
        yPosTop = 320 - rectHeight - 10;
        yPosRect = 320 - rectHeight;
    }
    else {
        yPosTop = event.y + delta - 10;
        event.y + delta - 10;
        yPosRect = yPosTop + 10;
    }
    addPosition(yPosRect, d.name, 'top');
    addPosition(yPosRect + rectHeight, d.name, 'bottom');
    if (yPosTop == 70) {
        select('#triangle_down_' + cleanDimensionName)
            .attr('href', '#brush_image_bottom');
    }
    else {
        select('#triangle_down_' + cleanDimensionName)
            .attr('href', '#brush_image_bottom_active');
    }
    if (yPosBottom == 320) {
        select('#triangle_up_' + cleanDimensionName)
            .attr('href', '#brush_image_top');
    }
    else {
        select('#triangle_up_' + cleanDimensionName)
            .attr('href', '#brush_image_top_active');
    }
    if (rectHeight < 240) {
        select('#rect_' + cleanDimensionName)
            .attr('y', yPosRect);
        select('#triangle_down_' + cleanDimensionName)
            .attr('y', yPosTop);
        select('#triangle_up_' + cleanDimensionName)
            .attr('y', yPosRect + rectHeight);
        select('#triangle_up_hit' + cleanDimensionName)
            .attr('y', yPosRect + rectHeight);
        select('#triangle_down_hit' + cleanDimensionName)
            .attr('y', yPosTop);
        if (!isNaN(parcoords.yScales[d.name].domain()[0])) {
            setToolTipDragAndBrush(tooltipValuesTop, tooltipValuesDown, d, window, true, yPosTop, yPosRect + rectHeight);
        }
        if (currWebTech === "SVG-DOM") {
            updateLines(d.name, cleanDimensionName);
        }
        else {
            updateCanvasLines(d.name, cleanDimensionName);
        }
    }
}
function filter(dimensionName, min, max) {
    const cleanDimensionName = cleanString(dimensionName);
    const invertStatus = getInvertStatus(dimensionName);
    const yScale = parcoords.yScales[dimensionName];
    let topPosition = yScale(min);
    let bottomPosition = yScale(max);
    if (invertStatus) {
        [topPosition, bottomPosition] = [bottomPosition, topPosition];
    }
    const rectY = Math.min(topPosition, bottomPosition);
    const rectHeight = Math.abs(bottomPosition - topPosition);
    addPosition(topPosition, dimensionName, 'top');
    addPosition(bottomPosition, dimensionName, 'bottom');
    select('#rect_' + cleanDimensionName)
        .transition()
        .duration(1000)
        .attr('y', rectY)
        .attr('height', rectHeight)
        .style('opacity', 0.3);
    select('#triangle_down_' + cleanDimensionName)
        .transition()
        .duration(1000)
        .attr('y', rectY - 10);
    select('#triangle_down_hit' + cleanDimensionName)
        .transition()
        .duration(1000)
        .attr('y', rectY - 10);
    select('#triangle_up_' + cleanDimensionName)
        .transition()
        .duration(1000)
        .attr('y', rectY + rectHeight);
    select('#triangle_up_hit' + cleanDimensionName)
        .transition()
        .duration(1000)
        .attr('y', rectY + rectHeight);
    if (topPosition == 80) {
        select('#triangle_down_' + cleanDimensionName)
            .attr('href', '#brush_image_bottom');
    }
    else {
        select('#triangle_down_' + cleanDimensionName)
            .attr('href', '#brush_image_bottom_active');
    }
    if (bottomPosition == 320) {
        select('#triangle_up_' + cleanDimensionName)
            .attr('href', '#brush_image_top');
    }
    else {
        select('#triangle_up_' + cleanDimensionName)
            .attr('href', '#brush_image_top_active');
    }
    let active = select('g.active').selectAll('path');
    const rectTop = Math.min(topPosition, bottomPosition);
    const rectBottom = Math.max(topPosition, bottomPosition);
    if (isDimensionCategorical(dimensionName)) {
        const selectedCategories = yScale.domain().filter((cat) => {
            const pos = yScale(cat);
            return pos >= rectTop && pos <= rectBottom;
        });
        addRange(selectedCategories, parcoords.currentPosOfDims, dimensionName, "currentFilterCategories");
    }
    else {
        addRange(yScale.invert(rectBottom), parcoords.currentPosOfDims, dimensionName, "currentFilterBottom");
        addRange(yScale.invert(rectTop), parcoords.currentPosOfDims, dimensionName, "currentFilterTop");
    }
    active.each(function (d) {
        const value = yScale(d[dimensionName]);
        const currentLine = getLineName(d);
        const dimNameToCheck = select('.' + currentLine).text();
        const emptyString = '';
        if (value < rectTop || value > rectBottom) {
            if (dimNameToCheck === emptyString) {
                makeInactive(currentLine, dimensionName, 1000);
            }
        }
        else if (dimNameToCheck === dimensionName && dimNameToCheck !== emptyString) {
            let checkedLines = [];
            parcoords.currentPosOfDims.forEach(function (item) {
                if (item.top != yScale.range()[1] || item.bottom != yScale.range()[0]) {
                    checkAllPositionsTop(item, dimensionName, d, checkedLines, currentLine);
                    checkAllPositionsBottom(item, dimensionName, d, checkedLines, currentLine);
                }
            });
            if (!checkedLines.includes(currentLine)) {
                makeActive(currentLine, 1000);
            }
        }
    });
}
function getLineName(d) {
    const keys = Object.keys(d);
    const key = keys[0];
    return cleanString(d[key]);
}
function addPosition(yPosTop, dimension, key) {
    let newObject = {};
    newObject[key] = yPosTop;
    const target = parcoords.currentPosOfDims.find((obj) => obj.key == dimension);
    Object.assign(target, newObject);
}
function setToolTipBrush(tooltipValues, d, event, window, direction) {
    const range = parcoords.yScales[d.name].domain();
    const invertStatus = getInvertStatus(d.name);
    const maxValue = invertStatus == false ? range[1] : range[0];
    const minValue = invertStatus == false ? range[0] : range[1];
    const scale = maxValue - minValue;
    let tooltipValue;
    if (invertStatus) {
        tooltipValue = direction == true ? ((event.y - 70) / (240 / (scale)) + minValue) :
            ((event.y - 80) / (240 / (scale)) + minValue);
    }
    else {
        tooltipValue = direction == true ? maxValue - ((event.y - 70) / (240 / (scale))) :
            maxValue - ((event.y - 80) / (240 / (scale)));
    }
    if (!invertStatus) {
        if (tooltipValue > range[1]) {
            tooltipValue = range[1];
        }
        if (tooltipValue < range[0]) {
            tooltipValue = range[0];
        }
    }
    else {
        if (tooltipValue > range[0]) {
            tooltipValue = range[0];
        }
        if (tooltipValue < range[1]) {
            tooltipValue = range[1];
        }
    }
    const digs = getSigDig(d.name);
    tooltipValues.text(Math.round(tooltipValue.toPrecision(digs).toLocaleString('en-GB') * 10) / 10);
    tooltipValues.style('visibility', 'visible');
    tooltipValues.style('top', window.event.pageY + 'px').style('left', window.event.pageX + 'px');
    tooltipValues.style('font-size', '0.75rem').style('border', 0.08 + 'rem solid gray')
        .style('border-radius', 0.1 + 'rem').style('margin', 0.5 + 'rem')
        .style('padding', 0.12 + 'rem').style('white-space', 'pre-line')
        .style('background-color', 'LightGray').style('margin-left', 0.5 + 'rem');
}
function setToolTipDragAndBrush(tooltipValuesTop, tooltipValuesDown, d, window, direction, yPosTop, yPosBottom) {
    const range = parcoords.yScales[d.name].domain();
    const invertStatus = getInvertStatus(d.name);
    const maxValue = invertStatus == false ? range[1] : range[0];
    const minValue = invertStatus == false ? range[0] : range[1];
    const scale = maxValue - minValue;
    let tooltipValueTop;
    let tooltipValueBottom;
    if (invertStatus) {
        tooltipValueTop = direction == true ? ((yPosTop - 70) / (240 / (scale)) + minValue) :
            ((yPosTop - 80) / (240 / (scale)) + minValue);
        tooltipValueBottom = direction == true ? ((yPosBottom - 80) / (240 / (scale)) + minValue) :
            ((yPosBottom - 70) / (240 / (scale)) + minValue);
    }
    else {
        tooltipValueTop = direction == true ? maxValue - ((yPosTop - 70) / (240 / (scale))) :
            maxValue - ((yPosTop - 80) / (240 / (scale)));
        tooltipValueBottom = direction == true ? maxValue - ((yPosBottom - 80) / (240 / (scale))) :
            maxValue - ((yPosBottom - 70) / (240 / (scale)));
    }
    if ((!invertStatus && tooltipValueTop == maxValue) || (invertStatus && tooltipValueTop == minValue)) {
        tooltipValuesTop.style('visibility', 'hidden');
    }
    else {
        tooltipValuesTop.text(Math.round(tooltipValueTop));
        tooltipValuesTop.style('visibility', 'visible');
        tooltipValuesTop.style('top', Number(yPosTop + 180) + 'px').style('left', window.event.pageX + 'px');
        tooltipValuesTop.style('font-size', '0.75rem').style('border', 0.08 + 'rem solid gray')
            .style('border-radius', 0.1 + 'rem').style('margin', 0.5 + 'rem')
            .style('padding', 0.12 + 'rem').style('white-space', 'pre-line')
            .style('background-color', 'LightGray').style('margin-left', 0.5 + 'rem');
    }
    if ((!invertStatus && tooltipValueBottom == minValue) || (invertStatus && tooltipValueBottom == maxValue)) {
        tooltipValuesDown.style('visibility', 'hidden');
    }
    else {
        tooltipValuesDown.text(Math.round(tooltipValueBottom));
        tooltipValuesDown.style('visibility', 'visible');
        tooltipValuesDown.style('top', Number(yPosBottom + 180) + 'px').style('left', window.event.pageX + 'px');
        tooltipValuesDown.style('font-size', '0.75rem').style('border', 0.08 + 'rem solid gray')
            .style('border-radius', 0.1 + 'rem').style('margin', 0.5 + 'rem')
            .style('padding', 0.12 + 'rem').style('white-space', 'pre-line')
            .style('background-color', 'LightGray').style('margin-left', 0.5 + 'rem');
    }
}
function updateLines(dimension, cleanDimensionName) {
    const rangeTop = Number(select('#triangle_down_' + cleanDimensionName).attr('y'));
    const rangeBottom = Number(select('#triangle_up_' + cleanDimensionName).attr('y'));
    const invertStatus = getInvertStatus(dimension);
    const maxValue = invertStatus == false ? parcoords.yScales[dimension].domain()[1] : parcoords.yScales[dimension].domain()[0];
    const minValue = invertStatus == false ? parcoords.yScales[dimension].domain()[0] : parcoords.yScales[dimension].domain()[1];
    const range = maxValue - minValue;
    let currentFilters = getFilter(dimension);
    if (isDimensionCategorical(dimension)) {
        const selectedCategories = parcoords.yScales[dimension].domain().filter((cat) => {
            const pos = parcoords.yScales[dimension](cat);
            return pos >= rangeTop && pos <= rangeBottom;
        });
        addRange(selectedCategories, parcoords.currentPosOfDims, dimension, "currentFilterCategories");
    }
    else {
        addRange(currentFilters[0], parcoords.currentPosOfDims, dimension, "currentFilterBottom");
        addRange(currentFilters[1], parcoords.currentPosOfDims, dimension, "currentFilterTop");
    }
    let active = select('g.active').selectAll('path');
    active.each(function (d) {
        let value;
        if (invertStatus) {
            value = isNaN(maxValue) ? parcoords.yScales[dimension](d[dimension]) :
                240 / range * (d[dimension] - minValue) + 80;
        }
        else {
            value = isNaN(maxValue) ? parcoords.yScales[dimension](d[dimension]) :
                240 / range * (maxValue - d[dimension]) + 80;
        }
        const currentLine = getLineName(d);
        const dimNameToCheck = select('.' + currentLine).text();
        const emptyString = '';
        if (value < rangeTop + 10 || value > rangeBottom) {
            if (dimNameToCheck == emptyString) {
                makeInactive(currentLine, dimension, 100);
            }
        }
        else if (value == 320 && value == rangeTop + 10 && value == rangeBottom) {
            if (dimNameToCheck == emptyString) {
                makeInactive(currentLine, dimension, 100);
            }
        }
        else if (value == 80 && value == rangeTop + 10 && value == rangeBottom) {
            if (dimNameToCheck == emptyString) {
                makeInactive(currentLine, dimension, 100);
            }
        }
        else if (dimNameToCheck == dimension && dimNameToCheck != emptyString) {
            let checkedLines = [];
            parcoords.currentPosOfDims.forEach(function (item) {
                if (item.top != 80 || item.bottom != 320) {
                    checkAllPositionsTop(item, dimension, d, checkedLines, currentLine);
                    checkAllPositionsBottom(item, dimension, d, checkedLines, currentLine);
                }
            });
            if (!checkedLines.includes(currentLine)) {
                makeActive(currentLine, 300);
            }
        }
        else ;
    });
}
function updateCanvasLines(dimension, cleanDimensionName) {
    const rangeTop = Number(select("#triangle_down_" + cleanDimensionName).attr("y"));
    const rangeBottom = Number(select("#triangle_up_" + cleanDimensionName).attr("y"));
    const invertStatus = getInvertStatus(dimension);
    const domain = parcoords.yScales[dimension].domain();
    const maxValue = !invertStatus ? domain[1] : domain[0];
    const minValue = !invertStatus ? domain[0] : domain[1];
    const range = maxValue - minValue;
    const currentFilters = getFilter(dimension);
    if (isDimensionCategorical(dimension)) {
        const selectedCategories = parcoords
            .yScales[dimension]
            .domain()
            .filter((cat) => {
            const pos = parcoords.yScales[dimension](cat);
            return pos >= rangeTop && pos <= rangeBottom;
        });
        addRange(selectedCategories, parcoords.currentPosOfDims, dimension, "currentFilterCategories");
    }
    else {
        addRange(currentFilters[0], parcoords.currentPosOfDims, dimension, "currentFilterBottom");
        addRange(currentFilters[1], parcoords.currentPosOfDims, dimension, "currentFilterTop");
    }
    for (const row of parcoords.newDataset) {
        const currentLineName = getLineName(row);
        let valueY;
        if (isDimensionCategorical(dimension)) {
            const cat = row[dimension];
            valueY = parcoords.yScales[dimension](cat);
        }
        else {
            const v = Number(row[dimension]);
            if (isNaN(maxValue)) {
                valueY = parcoords.yScales[dimension](v);
            }
            else if (invertStatus) {
                valueY = (240 / range) * (v - minValue) + 80;
            }
            else {
                valueY = (240 / range) * (maxValue - v) + 80;
            }
        }
        const mainInside = valueY >= rangeTop + 10 && valueY <= rangeBottom;
        const specialAllRange320 = valueY === 320 && valueY === rangeTop + 10 && valueY === rangeBottom;
        const specialAllRange80 = valueY === 80 && valueY === rangeTop + 10 && valueY === rangeBottom;
        if (!mainInside || specialAllRange320 || specialAllRange80) {
            makeLineInactiveCanvas(currentLineName);
        }
        else {
            makeLineActiveCanvas(currentLineName);
        }
    }
    redrawPolylines(parcoords.newDataset, parcoords);
}
function addRange(value, dims, dimension, property) {
    const dimSettings = dims.find(d => d.key === dimension);
    if (!dimSettings)
        return;
    const yScale = parcoords.yScales[dimension];
    const domain = yScale.domain();
    if (typeof domain[0] === "number") {
        dimSettings.type = "numeric";
        if (property === "currentFilterTop" || property === "currentFilterBottom") {
            dimSettings[property] = value;
        }
    }
    else {
        dimSettings.type = "categorical";
        if (property === "currentFilterCategories") {
            dimSettings.currentFilterCategories = value;
        }
    }
}
function checkAllPositionsTop(positionItem, dimension, d, checkedLines, currentLine) {
    if (positionItem.key != dimension && positionItem.top != 70) {
        const invertStatus = getInvertStatus(positionItem.key);
        const maxValue = invertStatus == false ? parcoords.yScales[positionItem.key].domain()[1] :
            parcoords.yScales[positionItem.key].domain()[0];
        const minValue = invertStatus == false ? parcoords.yScales[positionItem.key].domain()[0] :
            parcoords.yScales[positionItem.key].domain()[1];
        const scale = maxValue - minValue;
        let value;
        if (!isNaN(maxValue)) {
            value = invertStatus == false ? 240 / scale * (maxValue - d[positionItem.key]) + 80 :
                240 / scale * (d[positionItem.key] - minValue) + 80;
        }
        else {
            value = parcoords.yScales[positionItem.key](d[positionItem.key]);
        }
        if (value < positionItem.top) {
            checkedLines.push(currentLine);
            select('.' + currentLine).text(positionItem.key);
        }
    }
}
function checkAllPositionsBottom(positionItem, dimension, d, checkedLines, currentLine) {
    if (positionItem.key != dimension && positionItem.bottom != 320) {
        const invertStatus = getInvertStatus(positionItem.key);
        const maxValue = invertStatus == false ? parcoords.yScales[positionItem.key].domain()[1] :
            parcoords.yScales[positionItem.key].domain()[0];
        const minValue = invertStatus == false ? parcoords.yScales[positionItem.key].domain()[0] :
            parcoords.yScales[positionItem.key].domain()[1];
        const scale = maxValue - minValue;
        let value;
        if (!isNaN(maxValue)) {
            value = invertStatus == false ? 240 / scale * (maxValue - d[positionItem.key]) + 80 :
                240 / scale * (d[positionItem.key] - minValue) + 80;
        }
        else {
            value = parcoords.yScales[positionItem.key](d[positionItem.key]);
        }
        if (value >= positionItem.bottom) {
            checkedLines.push(currentLine);
            select('.' + currentLine).text(positionItem.key);
        }
    }
}
function makeActive(currentLineName, duration) {
    if (select('.' + currentLineName).classed('selected')) {
        select('.' + currentLineName)
            .style('pointer-events', 'stroke')
            .text('')
            .transition()
            .duration(duration)
            .style('stroke', 'rgba(255, 165, 0, 1)');
    }
    else {
        select('.' + currentLineName)
            .style('pointer-events', 'stroke')
            .text('')
            .transition()
            .duration(duration)
            .style('stroke', 'rgba(0, 129, 175, 0.5)');
    }
}
function makeInactive(currentLineName, dimension, duration) {
    const line = select('.' + currentLineName);
    line
        .text(dimension)
        .transition()
        .duration(duration)
        .style('stroke', 'rgba(211, 211, 211, 0.4')
        .on('end', function () {
        select(this).style('pointer-events', 'none');
    });
}
function addSettingsForBrushing(dimension, invertStatus) {
    const processedName = cleanString(dimension);
    const yScale = parcoords.yScales[processedName];
    const dimensionSettings = parcoords.currentPosOfDims.find((d) => d.key === dimension);
    let top, bottom;
    if (isDimensionCategorical(dimension)) {
        const domain = yScale.domain();
        const sorted = domain.slice().sort((a, b) => yScale(a) - yScale(b));
        const topCategory = sorted[0];
        const bottomCategory = sorted[sorted.length - 1];
        top = yScale(topCategory);
        bottom = yScale(bottomCategory);
    }
    else {
        top = yScale(dimensionSettings.currentFilterTop);
        bottom = yScale(dimensionSettings.currentFilterBottom);
    }
    if (invertStatus) {
        [top, bottom] = [bottom, top];
    }
    const rectY = Math.min(top, bottom);
    const rectH = Math.abs(bottom - top);
    const rect = select('#rect_' + processedName);
    const triDown = select('#triangle_down_' + processedName);
    const triUp = select('#triangle_up_' + processedName);
    rect.transition()
        .duration(300)
        .attr('y', rectY)
        .attr('height', rectH)
        .style('opacity', 0.3);
    triDown.transition()
        .duration(300)
        .attr('y', rectY - 10);
    triUp.transition()
        .duration(300)
        .attr('y', rectY + rectH);
    addPosition(top, dimension, 'top');
    addPosition(bottom, dimension, 'bottom');
}
function getInvertStatus(key) {
    const item = parcoords.currentPosOfDims.find((object) => object.key == key);
    return item.isInverted;
}
function getSigDig(key) {
    const item = parcoords.currentPosOfDims.find((object) => object.key == key);
    return item.sigDig;
}
function addInvertStatus(status, dimensionName, key) {
    let newObject = {};
    newObject[key] = status;
    const target = parcoords.currentPosOfDims.find((obj) => obj.key == dimensionName);
    Object.assign(target, newObject);
}
const delay = 50;
const throttleBrushDown = throttle(brushDown, delay);
const throttleBrushUp = throttle(brushUp, delay);
const throttleDragAndBrush = throttle(dragAndBrush, delay);

let ctx = null;
function getPolylinePoints$2(d, parcoords) {
    const pts = [];
    parcoords.newFeatures.forEach((name) => {
        const x = parcoords.dragging[name] !== undefined
            ? parcoords.dragging[name]
            : parcoords.xScales(name);
        const y = parcoords.yScales[name](d[name]);
        pts.push([x, y]);
    });
    return pts;
}
function redrawCanvasLines(dataset, parcoords) {
    if (!ctx || !canvasEl || !dataset)
        return;
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    for (const d of dataset) {
        const id = getLineName(d);
        const active = lineState[id]?.active ?? true;
        const pts = getPolylinePoints$2(d, parcoords);
        if (!pts.length)
            continue;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++)
            ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = active
            ? "rgba(0,129,175,0.5)" // active
            : "rgba(211,211,211,0.4)"; // inactive (faded)
        ctx.stroke();
    }
}
function initCanvas2D(dpr) {
    ctx = canvasEl.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // 2D only
    return ctx;
}

// webglCanvas.ts
let gl = null;
let program;
// Determines the position of the pixel
// vec2 position is the vertex position (xy)
// vec2 resolution is the canvas width/height
// zeroToOne normalizes the points, then converts to webgl -1 to 1
// then flips the Y axis because Canvas2D is top left 0,0 and webgl is bottom left 0,0
const vertexShaderSrc = `
attribute vec2 position;
uniform vec2 resolution;

void main() {
  vec2 zeroToOne = position / resolution;
  vec2 clipSpace = zeroToOne * 2.0 - 1.0;
  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1); // flip Y
}
`;
// Determines the color of that pixel
// precision mediump float is the precision level for the float
const fragmentShaderSrc = `
precision mediump float;
uniform vec4 u_color;

void main() {
  gl_FragColor = u_color;
}
`;
// Compiles shaders on gpu and throws errors if failure
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        throw new Error("Shader compile failed");
    }
    return shader;
}
// combines vertex and fragment shaders and links them to the program and checks for errors
// the program is just the program that runs on the gpu to render
function createProgram(gl, vShader, fShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        throw new Error("Program link failed");
    }
    return program;
}
// Initialize WebGL
// dpr gets the device pixel ratio for high density screens (like my laptop)
// canvas size is the canvas width and height * the pixel density (otherwise things will appear too small on high density screens)
// create the vertex and fragment shader and put them in the program (which will run on the gpu)
// 
function initCanvasWebGL() {
    const dpr = window.devicePixelRatio || 1;
    canvasEl.width = canvasEl.clientWidth * dpr;
    canvasEl.height = canvasEl.clientHeight * dpr;
    gl = canvasEl.getContext("webgl");
    if (!gl)
        throw new Error("WebGL not supported");
    const vShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc);
    const fShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
    program = createProgram(gl, vShader, fShader);
    gl.viewport(0, 0, canvasEl.width, canvasEl.height);
    // gl.clearColor(1, 1, 1, 1); // white background
    gl.clear(gl.COLOR_BUFFER_BIT);
    return gl;
}
// converts rows to x,y coordinates in canvas space
function getPolylinePoints$1(d, parcoords, dpr) {
    const pts = [];
    parcoords.newFeatures.forEach((name) => {
        const x = (parcoords.dragging[name] ?? parcoords.xScales(name)) * dpr;
        const y = parcoords.yScales[name](d[name]) * dpr;
        pts.push([x, y]);
    });
    return pts;
}
// Draw one polyline
function drawPolyline(pts) {
    if (!gl || !program || !pts.length)
        return;
    //flatten points and put in Float32Array which WebGL needs
    const vertices = new Float32Array(pts.flat());
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    //run program on GPU
    gl.useProgram(program);
    //get positions and map them to the canvas
    const posLoc = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    const resolutionLoc = gl.getUniformLocation(program, "resolution");
    gl.uniform2f(resolutionLoc, canvasEl.width, canvasEl.height);
    //set color
    const colorLoc = gl.getUniformLocation(program, "u_color");
    // gl.uniform4f(colorLoc, 0, 129 / 255, 175 / 255, 0.5); // copied color from Filip but with the thinner lines it looks worse
    gl.uniform4f(colorLoc, 0, 0.3, 0.6, 1.0); //darker because of thinner lines
    //draw lines between all the points
    gl.drawArrays(gl.LINE_STRIP, 0, pts.length);
    // clear buffer
    gl.deleteBuffer(buffer);
}
// Redraw all the lines
function redrawWebGLLines(dataset, parcoords) {
    if (!gl)
        return;
    gl.clear(gl.COLOR_BUFFER_BIT);
    const dpr = window.devicePixelRatio || 1;
    for (const d of dataset) {
        const pts = getPolylinePoints$1(d, parcoords, dpr);
        drawPolyline(pts);
    }
}

let device;
let pipeline;
let pass;
let encoder;
let activeBindGroup;
let inactiveBindGroup;
let context;
function getPolylinePoints(d, parcoords, dpr) {
    const pts = [];
    parcoords.newFeatures.forEach((name) => {
        const x = (parcoords.dragging[name] ?? parcoords.xScales(name)) * dpr;
        const y = parcoords.yScales[name](d[name]) * dpr;
        pts.push([x, y]);
    });
    return pts;
}
function initWebGPU() {
    // Check if the GPU device is initialized
    if (!device)
        throw new Error("GPU device is not initialized. Call initCanvasWebGPU first.");
    // Get WebGPU context and configure it
    context = canvasEl.getContext("webgpu");
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    // Configure the context with device and format
    context.configure({
        device: device, // Use the GPU device initialized earlier
        format: canvasFormat, // Use the preferred canvas format
        // By default a WebGPU canvas is opaque. Its alpha channel is ignored. 
        // To make it not ignored we have to set its alphaMode to 'premultiplied' when we call configure. 
        // The default is 'opaque'
        // It’s important to understand what alphaMode: 'premultiplied' means. 
        // It means, the colors you put in the canvas must have their color values 
        // already multiplied by the alpha value.
        alphaMode: "premultiplied",
    });
    // Create a new shader module on the GPU device
    const cellShaderModule = device.createShaderModule({
        // The label is used for debugging purposes.
        label: "Vertex Shader",
        // The code has the WGSL shader code.
        // Struct VSOut defines a structure for the vertex shader’s output.
        // The vertex shader must output a position for each vertex — 
        // the built-in value @builtin(position) is special; it tells WebGPU 
        // that this field represents the position in clip space 
        // (the coordinate system before rasterization).
        // @vertex fn vs_main(@location(0) pos: vec2<f32>) -> VSOut 
        // { @vertex marks this as the vertex shader entry point. 
        // The function name vs_main is arbitrary — 
        // We reference it later when creating your render pipeline. 
        // The parameter @location(0) pos means: 
        // Take input from vertex buffer attribute 0. 
        // Each vertex provides a 2D position (a vec2<f32>).
        // var out: VSOut; 
        // Declares a variable out that will hold the shader’s output — 
        // the struct defined earlier.
        // out.position = vec4<f32>(pos, 0.0, 1.0); 
        // Converts the 2D input pos into a 4D position vector required by the GPU pipeline.
        // The GPU expects a 4D position in clip space:
        // (x, y) → come from your input
        // z = 0.0 → no depth for now (flat geometry)
        // w = 1.0 → homogeneous coordinate (used in perspective divide later)
        // @fragment fn fs_main() -> @location(0) vec4<f32> {
        // @fragment marks this as the fragment shader entry point.
        // It runs once per pixel that the geometry covers.
        // The return value @location(0) means the output color is written 
        // to the first color attachment in your render target (usually the screen)
        code: `
      
      @group(0) @binding(0) var<uniform> color: vec4<f32>;

      struct VSOut {
        @builtin(position) position : vec4<f32>,
      };

      @vertex
      fn vs_main(@location(0) pos: vec2<f32>) -> VSOut {
        var out: VSOut;
        out.position = vec4<f32>(pos, 0.0, 1.0);
        return out;
      }

      @fragment
      fn fs_main() -> @location(0) vec4<f32> {
        // rgba(0, 129, 175, 0.5)
        // return vec4<f32>(0.0, 129.0 / 255.0, 175.0 / 255.0, 0.5);
        return color;
      }
    `
    });
    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: {},
            },
        ],
    });
    const vertexBufferLayout = {
        // arrayStride is the number of bytes the GPU needs to skip 
        // forward in the buffer when it's looking for the next vertex. 
        // Each vertex of your square is made up of two 32-bit floating point numbers. 
        // As mentioned earlier, a 32-bit float is 4 bytes, so two floats is 8 bytes.
        arrayStride: 8,
        attributes: [
            {
                // https://gpuweb.github.io/gpuweb/#enumdef-gpuvertexformat
                // Format comes from a list of GPUVertexFormat types that describe 
                // each type of vertex data that the GPU can understand. 
                // The vertices here have two 32-bit floats each, so we use the format float32x2
                format: "float32x2",
                // the offset describes how many bytes into the vertex this particular attribute starts. 
                offset: 0,
                // The shaderLocation. This is an arbitrary number between 0 and 15 
                // and must be unique for every attribute that you define. 
                // It links this attribute to a particular input in the vertex shader.
                shaderLocation: 0,
            },
        ],
    };
    pipeline = device.createRenderPipeline({
        // Every pipeline needs a layout that describes what types of inputs.
        layout: device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout],
        }),
        // Now, we provide details about the vertex stage. 
        vertex: {
            // The module is the GPUShaderModule that contains your vertex shader, 
            module: cellShaderModule,
            // The entryPoint gives the name of the function in the shader code that is 
            // called for every vertex invocation. (You can have multiple @vertex and @fragment 
            // functions in a single shader module!) 
            entryPoint: "vs_main",
            // The buffers is an array of GPUVertexBufferLayout 
            // objects that describe how your data is packed in the vertex buffers that you use 
            // this pipeline with. 
            buffers: [vertexBufferLayout],
        },
        fragment: {
            module: cellShaderModule,
            entryPoint: "fs_main",
            targets: [{
                    format: canvasFormat,
                    blend: {
                        color: {
                            // srcFactor is the factor for the source color (the color being drawn)
                            srcFactor: "src-alpha",
                            // dstFactor is the factor for the destination color (the color already in the framebuffer)
                            dstFactor: "one-minus-src-alpha",
                            // operation is the blending operation to apply
                            operation: "add",
                        },
                        alpha: {
                            // srcFactor is the factor for the source alpha (the alpha being drawn)
                            srcFactor: "one",
                            // dstFactor is the factor for the destination alpha (the alpha already in the framebuffer)
                            dstFactor: "one-minus-src-alpha",
                            // operation is the blending operation to apply
                            operation: "add",
                        },
                    },
                }],
        },
        primitive: {
            // We are drawing lines
            topology: "line-strip",
            // For pipelines with strip topologies ("line-strip" or "triangle-strip"), this determines the 
            // index buffer format and primitive restart value ("uint16"/0xFFFF or "uint32"/0xFFFFFFFF). 
            // It is not allowed on pipelines with non-strip topologies.
            stripIndexFormat: undefined,
        },
    });
    // Create uniform buffers for active and inactive colors
    const activeColorBuffer = device.createBuffer({
        size: 16, // vec4<f32> = 16 bytes
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(activeColorBuffer, 0, new Float32Array([0.0, 129.0 / 255.0, 175.0 / 255.0, 0.5]));
    const inactiveColorBuffer = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(inactiveColorBuffer, 0, new Float32Array([211.0 / 255.0, 211.0 / 255.0, 211.0 / 255.0, 0.4]));
    // Create bind groups for each color
    activeBindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [{ binding: 0, resource: { buffer: activeColorBuffer } }],
    });
    inactiveBindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [{ binding: 0, resource: { buffer: inactiveColorBuffer } }],
    });
    // Create command encoder to encode GPU commands
    encoder = device.createCommandEncoder();
    // Begin a render pass
    pass = encoder.beginRenderPass({
        colorAttachments: [{
                view: context.getCurrentTexture().createView(),
                loadOp: "clear",
                // clear to transparent
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
                storeOp: "store",
            }],
    });
}
// Below function initializes WebGPU context and device
async function initCanvasWebGPU() {
    // console.log("Initializing WebGPU...");
    // The Navigator interface represents the state and the identity of the user agent. 
    // It allows scripts to query it and to register themselves to carry on some activities.
    if (!navigator.gpu) {
        throw new Error("WebGPU not supported.");
    }
    // Request and Check if a GPU adapter is available
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw new Error("GPU adapter unavailable.");
    }
    device = await adapter.requestDevice();
    // console.log("WebGPU initialized successfully.");
    initWebGPU();
}
function redrawWebGPULines(dataset, parcoords) {
    if (!device) {
        throw new Error("GPU device is not initialized. Call initCanvasWebGPU first.");
    }
    // Create command encoder to encode GPU commands
    encoder = device.createCommandEncoder();
    // Begin a render pass
    pass = encoder.beginRenderPass({
        colorAttachments: [{
                view: context.getCurrentTexture().createView(),
                loadOp: "clear",
                // clear to transparent
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
                storeOp: "store",
            }],
    });
    // The devicePixelRatio of Window interface returns the ratio of the resolution in physical pixels 
    // to the resolution in CSS pixels for the current display device.
    const dpr = window.devicePixelRatio || 1;
    // Get canvas dimensions
    const canvasWidth = canvasEl.width;
    const canvasHeight = canvasEl.height;
    // console.log("Context:", context);
    for (const d of dataset) {
        const id = getLineName(d);
        // Determine if the line is active or inactive
        const active = lineState[id]?.active ?? true;
        const pts = getPolylinePoints(d, parcoords, dpr);
        if (pts.length < 2)
            continue;
        // Create a vertex buffer for the polyline
        const verts = new Float32Array(pts.length * 2);
        for (let i = 0; i < pts.length; ++i) {
            const x = pts[i][0];
            const y = pts[i][1];
            const xClip = (x / canvasWidth) * 2 - 1;
            const yClip = 1 - (y / canvasHeight) * 2;
            verts[i * 2 + 0] = xClip;
            verts[i * 2 + 1] = yClip;
        }
        const vertexBuffer = device.createBuffer({
            label: "polyline-vertices",
            size: verts.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(vertexBuffer, 0, verts);
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, active ? activeBindGroup : inactiveBindGroup);
        pass.setVertexBuffer(0, vertexBuffer);
        pass.draw(verts.length / 2, 1, 0, 0);
    }
    // console.log(`Active lines: ${activeCount}, Inactive lines: ${inactiveCount}`);
    pass.end();
    device.queue.submit([encoder.finish()]);
}

let scrollXPos;
let timer;
function setContextMenu(featureAxis) {
    createContextMenu();
    createModalToSetRange();
    createModalToFilter();
    setToolTipsOnFeatureAxis(featureAxis);
    featureAxis
        .on('contextmenu', function (event, d) {
        const dimension = d.name;
        styleContextMenu(event);
        hideDimensionMenu(dimension);
        invertDimensionMenu(dimension);
        setRangeMenu(dimension);
        resetRangeMenu(dimension);
        resetRoundRangeMenu(dimension);
        filterMenu(dimension);
        resetFilterMenu(dimension);
        showAllMenu();
        copyDimensionName(dimension);
        event.preventDefault();
    });
}
function setToolTipsOnFeatureAxis(featureAxis) {
    let tooltipFeatures = select('body')
        .append('div')
        .attr('id', 'tooltip')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('visibility', 'hidden');
    featureAxis
        .append('text')
        .attr('class', 'dimension')
        .attr('text-anchor', 'middle')
        .attr('y', (80 / 1.7).toFixed(4))
        .text((d) => d.name.length > 10 ?
        d.name.substr(0, 10) + '...' : d.name)
        .style('font-size', '0.7rem')
        .call(drag()
        .on('start', onDragStartEventHandler())
        .on('drag', onDragEventHandler(featureAxis))
        .on('end', onDragEndEventHandler(featureAxis)))
        .on('mouseover', function () {
        return tooltipFeatures.style('visibility', 'visible');
    })
        .on('mousemove', (event, d) => {
        setCursorForDimensions(d, featureAxis);
        const [x, y] = getMouseCoords(event);
        tooltipFeatures.text(d.name);
        tooltipFeatures
            .style("left", x / 16 + 'rem')
            .style("top", y / 16 + 'rem')
            .style('font-size', '0.75rem')
            .style('border', 0.08 + 'rem solid gray')
            .style('border-radius', 0.1 + 'rem')
            .style('margin', 0.5 + 'rem')
            .style('padding', 0.12 + 'rem')
            .style('background-color', 'lightgrey')
            .style('margin-left', 0.5 + 'rem');
        return tooltipFeatures;
    })
        .on('mouseout', function () {
        return tooltipFeatures.style('visibility', 'hidden');
    });
}
function copyDimensionName(dimension) {
    select('#copyDimensionName')
        .style('visibility', 'visible')
        .on('click', async (event) => {
        await navigator.clipboard.writeText(dimension);
        select('#contextmenu').style('display', 'none');
        event.stopPropagation();
    });
}
function showAllMenu() {
    select('#showAllMenu')
        .style('visibility', 'visible')
        .style('border-top', '0.08rem lightgrey solid')
        .on('click', (event) => {
        const hiddenDimensions = getAllHiddenDimensionNames();
        for (let i = 0; i < hiddenDimensions.length; i++) {
            show(hiddenDimensions[i]);
        }
        select('#contextmenu').style('display', 'none');
        event.stopPropagation();
    });
}
function resetFilterMenu(dimension) {
    if (isDimensionCategorical(dimension)) {
        select('#resetfilterMenu')
            .style('color', 'lightgrey');
        return;
    }
    select('#resetfilterMenu')
        .style('visibility', 'visible')
        .style('color', 'black')
        .on('click', (event) => {
        const range = getDimensionRange(dimension);
        const inverted = isInverted(dimension);
        if (inverted) {
            setFilter(dimension, Number(range[0]), Number(range[1]));
        }
        else {
            setFilter(dimension, Number(range[1]), Number(range[0]));
        }
        select('#contextmenu').style('display', 'none');
        event.stopPropagation();
    });
}
function filterMenu(dimension) {
    let filterMenu = select('#filterMenu');
    filterMenu.style('border-top', '0.08rem lightgrey solid');
    if (isDimensionCategorical(dimension)) {
        filterMenu.style('color', 'lightgrey');
        return;
    }
    let currentFilters = getFilter(dimension);
    let minFilterValue = select('#minFilterValue');
    let maxFilterValue = select('#maxFilterValue');
    minFilterValue.property('value', currentFilters[0]);
    maxFilterValue.property('value', currentFilters[1]);
    minFilterValue.on('keypress', (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            document.getElementById("buttonFilter").click();
        }
    });
    maxFilterValue.on('keypress', (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            document.getElementById("buttonFilter").click();
        }
    });
    filterMenu.style('visibility', 'visible')
        .style('color', 'black');
    filterMenu.on('click', (event) => {
        select('#modalOverlayFilter').style('display', 'block');
        select('#modalFilter').style('display', 'block');
        select('#contextmenu').style('display', 'none');
        const header = dimension.length > 25 ? dimension.substr(0, 25) + '...' :
            dimension;
        select('#headerDimensionFilter').text(header);
        select('#closeButtonFilter').on('click', () => {
            select('#errorFilter').style('display', 'none');
            select('#modalFilter').style('display', 'none');
            select('#modalOverlayFilter').style('display', 'none');
        });
        select('#buttonFilter').on('click', () => {
            handleFilterButton(dimension);
            select('#contextmenu').style('display', 'none');
            event.stopPropagation();
        });
    });
}
function handleFilterButton(dimension) {
    let isOk = false;
    let minFilterValue = select('#minFilterValue');
    let maxFilterValue = select('#maxFilterValue');
    let errorMessage = select('#errorFilter').style('display', 'block');
    let min = Number(minFilterValue.node().value);
    let max = Number(maxFilterValue.node().value);
    const inverted = isInverted(dimension);
    const ranges = getDimensionRange(dimension);
    const minRange = Number(inverted ? ranges[1] : ranges[0]);
    const maxRange = Number(inverted ? ranges[0] : ranges[1]);
    if (max < min) {
        max = maxRange;
        errorMessage.text(`Max value is smaller than min value, filter is set to 
      min.`);
    }
    else if (min < minRange) {
        min = minRange;
        errorMessage.text(`Min value is smaller than ${getMinValue(dimension)},
     filter is set to min.`);
    }
    else if (min > maxRange) {
        min = maxRange;
        errorMessage.text(`Min value is bigger than max range value, filter is set
      to max.`);
    }
    else if (max > maxRange) {
        max = maxRange;
        errorMessage.text(`Max value is bigger than ${getMaxValue(dimension)},
     filter is set to max.`);
    }
    else if (max < minRange) {
        max = minRange;
        select('#errorFilter').text(`Max value is smaller than min range value, 
      filter is set to min.`);
    }
    else {
        isOk = true;
    }
    setFilter(dimension, max, min);
    if (isOk) {
        select('#errorFilter').style('display', 'none');
        select('#modalFilter').style('display', 'none');
        select('#modalOverlayFilter').style('display', 'none');
    }
}
function resetRoundRangeMenu(dimension) {
    if (isDimensionCategorical(dimension)) {
        select('#resetRoundRangeMenu')
            .style('color', 'lightgrey');
        return;
    }
    select('#resetRoundRangeMenu')
        .style('visibility', 'visible')
        .style('color', 'black')
        .on('click', (event) => {
        setDimensionRangeRounded(dimension, getMinValue(dimension), getMaxValue(dimension));
        select('#contextmenu').style('display', 'none');
        event.stopPropagation();
    });
}
function resetRangeMenu(dimension) {
    if (isDimensionCategorical(dimension)) {
        select('#resetRangeMenu')
            .style('display', 'false')
            .style('color', 'lightgrey');
        return;
    }
    select('#resetRangeMenu')
        .style('visibility', 'visible')
        .style('color', 'black')
        .on('click', (event) => {
        setDimensionRange(dimension, getMinValue(dimension), getMaxValue(dimension));
        select('#contextmenu').style('display', 'none');
        event.stopPropagation();
    });
}
function setRangeMenu(dimension) {
    let rangeMenu = select('#rangeMenu');
    rangeMenu.style('border-top', '0.08rem lightgrey solid');
    if (isDimensionCategorical(dimension)) {
        rangeMenu.style('color', 'lightgrey');
        return;
    }
    rangeMenu.style('visibility', 'visible')
        .style('color', 'black')
        .on('click', (event) => {
        handleRangeButton(dimension);
        select('#closeButtonRange').on('click', () => {
            select('#modalSetRange').style('display', 'none');
            select('#modalOverlaySetRange').style('display', 'none');
        });
        select('#contextmenu').style('display', 'none');
        event.stopPropagation();
    });
}
function handleRangeButton(dimension) {
    let minRange = getCurrentMinRange(dimension);
    let maxRange = getCurrentMaxRange(dimension);
    let resultMin = (minRange - Math.floor(minRange)) !== 0;
    let resultMax = (maxRange - Math.floor(maxRange)) !== 0;
    let minValue = String(minRange);
    let maxValue = String(maxRange);
    if (resultMin && !resultMax) {
        const count = minValue.split('.')[1].length;
        maxValue = maxRange.toFixed(count);
    }
    else if (!resultMin && resultMax) {
        const count = maxValue.split('.')[1].length;
        minValue = minRange.toFixed(count);
    }
    select('#minRangeValue').property('value', minValue);
    select('#maxRangeValue').property('value', maxValue);
    select('#contextmenu').style('display', 'none');
    select('#modalOverlaySetRange').style('display', 'block');
    select('#modalSetRange').style('display', 'block');
    const newText = dimension.length > 25 ? dimension.substr(0, 25) + '...' :
        dimension;
    select('#headerDimensionRange').text(newText);
    select('#infoRange3').text('Range values must be below the minimum and above the maximum data value.');
    select('#infoRange').text('The current range of ' + dimension + ' is between ' + minValue + ' and ' + maxValue + '.');
    select('#infoRange2').text('The original range of ' + dimension + ' is between ' + getMinValue(dimension) + ' and ' + getMaxValue(dimension) + '.');
    select('#buttonRange').on('click', () => {
        let min = select('#minRangeValue').node().value;
        let max = select('#maxRangeValue').node().value;
        const inverted = isInverted(dimension);
        let isOk = true;
        if (inverted) {
            if (max < getMinValue(dimension) ||
                min > getMaxValue(dimension)) {
                select('#errorRange').text(`The range has to be bigger than ${minValue} and ${maxValue}.`)
                    .style('display', 'block')
                    .style('padding-left', 0.5 + 'rem')
                    .style('padding-top', 0.5 + 'rem')
                    .style('color', 'red')
                    .style('font-size', 'x-small');
                isOk = false;
            }
        }
        else {
            if (min > getMinValue(dimension) ||
                max < getMaxValue(dimension)) {
                select('#errorRange').text(`The range has to be bigger than ${minValue} and ${maxValue}.`)
                    .style('display', 'block')
                    .style('padding-left', 0.5 + 'rem')
                    .style('padding-top', 0.5 + 'rem')
                    .style('color', 'red')
                    .style('font-size', 'x-small');
                isOk = false;
            }
        }
        if (isOk) {
            select('#errorRange').style('display', 'none');
            setDimensionRange(dimension, min, max);
            select('#modalSetRange').style('display', 'none');
            select('#modalOverlaySetRange').style('display', 'none');
        }
    });
    select('#maxRangeValue').on('keypress', (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            document.getElementById("buttonRange").click();
        }
    });
    select('#minRangeValue').on('keypress', (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            document.getElementById("buttonRange").click();
        }
    });
}
function invertDimensionMenu(dimension) {
    select('#invertMenu')
        .on('click', (event) => {
        invert(dimension);
        select('#contextmenu').style('display', 'none');
        event.stopPropagation();
    });
}
function hideDimensionMenu(dimension) {
    select('#hideMenu')
        .style('border-top', '0.08rem lightgrey solid')
        .on('click', (event) => {
        hide(dimension);
        select('#contextmenu').style('display', 'none');
        event.stopPropagation();
    });
}
function styleContextMenu(event) {
    const container = document.querySelector("#parallelcoords");
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    select('#contextmenu')
        .style('left', x + 'px')
        .style('top', y + 'px')
        .style('display', 'block')
        .style('font-size', '0.75rem').style('border', 0.08 + 'rem solid gray')
        .style('border-radius', 0.3 + 'rem').style('margin', 0.5 + 'rem')
        .style('padding', 0.35 + 'rem')
        .style('background-color', 'white').style('margin-left', 0.5 + 'rem')
        .style('cursor', 'pointer').style('minWidth', 15 + 'rem')
        .on('click', (event) => {
        event.stopPropagation();
    });
    selectAll('.contextmenu').style('padding', 0.35 + 'rem');
}
function setCursorForDimensions(d, featureAxis) {
    if (getDimensionPosition(d.name) == 0) {
        featureAxis
            .select('.dimension')
            .style('cursor', `url('data:image/svg+xml,${setSize(encodeURIComponent(getArrowRight()), 12)}') 8 8, auto`);
    }
    else if (getDimensionPosition(d.name) == parcoords.newFeatures.length - 1) {
        featureAxis
            .select('.dimension')
            .style('cursor', `url('data:image/svg+xml,${setSize(encodeURIComponent(getArrowLeft()), 12)}') 8 8, auto`);
    }
    else {
        featureAxis
            .select('.dimension')
            .style('cursor', `url('data:image/svg+xml,${setSize(encodeURIComponent(getArrowLeftAndRight()), 12)}') 8 8, auto`);
    }
}
function onDragStartEventHandler() {
    {
        return function onDragStart(d) {
            this.__origin__ = parcoords.xScales((d.subject).name);
            parcoords.dragging[(d.subject).name] = this.__origin__;
            parcoords.dragPosStart[(d.subject).name] = this.__origin__;
            const element = document.getElementById("parallelcoords");
            scrollXPos = element.scrollLeft;
        };
    }
}
function onDragEventHandler(featureAxis) {
    {
        return function onDrag(d) {
            if (timer !== null) {
                clearInterval(timer);
                timer = null;
            }
            timer = setInterval(() => { scroll(d); });
            parcoords.dragging[(d.subject).name] = Math.min(width - paddingXaxis, Math.max(paddingXaxis, this.__origin__ += d.x));
            active.each(function (d) {
                select(this)
                    .attr('d', linePath(d, parcoords.newFeatures));
            });
            parcoords.newFeatures.sort((a, b) => {
                return position(b, parcoords.dragging, parcoords.xScales)
                    - position(a, parcoords.dragging, parcoords.xScales) - 1;
            });
            parcoords.xScales.domain(parcoords.newFeatures);
            featureAxis.attr('transform', (d) => {
                return 'translate(' + position(d.name, parcoords.dragging, parcoords.xScales) + ')';
            });
        };
    }
}
function onDragEndEventHandler(featureAxis) {
    {
        return function onDragEnd(d) {
            const distance = (width - 80) / parcoords.newFeatures.length;
            const init = parcoords.dragPosStart[(d.subject).name];
            if (parcoords.dragPosStart[(d.subject).name] > parcoords.dragging[(d.
                subject).name]) {
                featureAxis.attr('transform', (d) => {
                    return 'translate(' + position(d.name, init - distance, parcoords.xScales) + ')';
                });
            }
            else {
                featureAxis.attr('transform', (d) => {
                    return 'translate(' + position(d.name, init - distance, parcoords.xScales) + ')';
                });
            }
            delete this.__origin__;
            delete parcoords.dragging[(d.subject).name];
            delete parcoords.dragPosStart[(d.subject).name];
            trans(active).each(function (d) {
                select(this)
                    .attr('d', linePath(d, parcoords.newFeatures));
            });
        };
    }
}
function scroll(d) {
    const element = document.getElementById("parallelcoords");
    if (parcoords.dragPosStart[(d.subject).name] < parcoords.dragging[(d.subject).
        name]) {
        element.scrollLeft += 5;
    }
    else if (scrollXPos + 20 > parcoords.dragging[(d.subject).name]) {
        element.scrollLeft -= 5;
    }
}
function createContextMenu() {
    let contextMenu = select('#parallelcoords')
        .append('g')
        .attr('id', 'contextmenu')
        .style('position', 'absolute')
        .style('display', 'none');
    contextMenu.append('div')
        .attr('id', 'copyDimensionName')
        .attr('class', 'contextmenu')
        .text('Copy Name');
    contextMenu.append('div')
        .attr('id', 'hideMenu')
        .attr('class', 'contextmenu')
        .text('Hide');
    contextMenu.append('div')
        .attr('id', 'invertMenu')
        .attr('class', 'contextmenu')
        .text('Invert');
    contextMenu.append('div')
        .attr('id', 'rangeMenu')
        .attr('class', 'contextmenu')
        .text('Set Range...');
    contextMenu.append('div')
        .attr('id', 'resetRangeMenu')
        .attr('class', 'contextmenu')
        .text('Set Range from Data');
    contextMenu.append('div')
        .attr('id', 'resetRoundRangeMenu')
        .attr('class', 'contextmenu')
        .text('Set Rounded Range from Data');
    contextMenu.append('div')
        .attr('id', 'filterMenu')
        .attr('class', 'contextmenu')
        .text('Set Filter...');
    contextMenu.append('div')
        .attr('id', 'resetfilterMenu')
        .attr('class', 'contextmenu')
        .text('Reset Filter');
    contextMenu.append('div')
        .attr('id', 'showAllMenu')
        .attr('class', 'contextmenu')
        .text('Show All');
}
function createModalToSetRange() {
    select('body')
        .append('div')
        .attr('id', 'modalOverlaySetRange')
        .style('position', 'fixed')
        .style('top', '0')
        .style('left', '0')
        .style('width', '100vw')
        .style('height', '100vh')
        .style('background-color', 'rgba(0, 0, 0, 0.5)')
        .style('display', 'none')
        .style('z-index', '999');
    select('#modalOverlaySetRange').on('click', () => {
        select('#modalSetRange').style('display', 'none');
        select('#modalOverlaySetRange').style('display', 'none');
    });
    const modalSetRange = select('body')
        .append('div')
        .attr('id', 'modalSetRange')
        .style('position', 'fixed')
        .style('top', '50%')
        .style('left', '50%')
        .style('transform', 'translate(-50%, -50%)')
        .style('z-index', '1000')
        .style('background-color', 'white')
        .style('padding', '1rem')
        .style('border-radius', '0.5rem')
        .style('box-shadow', '0 0.25rem 0.625rem rgba(0,0,0,0.2)')
        .style('display', 'none');
    createModalTitle(modalSetRange, 'Set Range for ');
    createCloseButton(modalSetRange, 'closeButtonRange');
    createHeader(modalSetRange, 'headerDimensionRange');
    createInfoMessage(modalSetRange, 'infoRange3');
    createInfoMessage(modalSetRange, 'infoRange');
    createInfoMessage(modalSetRange, 'infoRange2');
    createInputFieldWithLabel(modalSetRange, 'Min', 'minRangeValue');
    createInputFieldWithLabel(modalSetRange, 'Max', 'maxRangeValue');
    createButton(modalSetRange, 'buttonRange');
    createErrorMessage(modalSetRange, 'errorRange');
}
function createModalToFilter() {
    select('body')
        .append('div')
        .attr('id', 'modalOverlayFilter')
        .style('position', 'fixed')
        .style('top', '0')
        .style('left', '0')
        .style('width', '100vw')
        .style('height', '100vh')
        .style('background-color', 'rgba(0, 0, 0, 0.5)')
        .style('display', 'none')
        .style('z-index', '999');
    select('#modalOverlayFilter').on('click', () => {
        select('#modalFilter').style('display', 'none');
        select('#modalOverlayFilter').style('display', 'none');
    });
    const modalFilter = select('body')
        .append('div')
        .attr('id', 'modalFilter')
        .style('position', 'fixed')
        .style('top', '50%')
        .style('left', '50%')
        .style('transform', 'translate(-50%, -50%)')
        .style('z-index', '1000')
        .style('background-color', 'white')
        .style('padding', '1rem')
        .style('border-radius', '0.5rem')
        .style('box-shadow', '0 0.25rem 0.625rem rgba(0,0,0,0.2)')
        .style('display', 'none');
    createModalTitle(modalFilter, 'Set Filter for ');
    createCloseButton(modalFilter, 'closeButtonFilter');
    createHeader(modalFilter, 'headerDimensionFilter');
    createInputFieldWithLabel(modalFilter, 'Min', 'minFilterValue');
    createInputFieldWithLabel(modalFilter, 'Max', 'maxFilterValue');
    createButton(modalFilter, 'buttonFilter');
    createErrorMessage(modalFilter, 'errorFilter');
}
function createModalTitle(modal, modalTitel) {
    const title = document.createElement('div');
    title.textContent = modalTitel;
    title.style.paddingLeft = '0.5rem';
    title.style.fontSize = 'large';
    modal.append(() => title);
}
function createHeader(modal, id) {
    const header = document.createElement('div');
    header.id = id;
    header.style.paddingLeft = '0.5rem';
    header.style.fontSize = 'large';
    modal.append(() => header);
}
function createInfoMessage(modal, id) {
    const infoMessage = document.createElement('div');
    infoMessage.id = id;
    infoMessage.style.color = 'grey';
    infoMessage.style.fontSize = 'smaller';
    infoMessage.style.paddingLeft = '0.5rem';
    infoMessage.style.paddingBottom = '0.5rem';
    infoMessage.style.paddingTop = '1rem';
    modal.append(() => infoMessage);
}
function createInputFieldWithLabel(modal, text, inputId) {
    const label = document.createElement('label');
    label.textContent = text;
    label.style.padding = '0.5rem';
    modal.append(() => label);
    const input = document.createElement('input');
    input.type = 'number';
    input.id = inputId;
    input.style.width = '4.5rem';
    input.style.border = '0.1rem solid lightgrey';
    input.style.borderRadius = "5%";
    modal.append(() => input);
}
function createButton(modal, id) {
    const button = document.createElement('button');
    button.id = id;
    button.textContent = 'Save';
    button.style.marginLeft = '0.5rem';
    button.style.marginTop = '1rem';
    button.style.width = '6.2rem';
    modal.append(() => button);
}
function createCloseButton(modal, id) {
    const closeButton = document.createElement('span');
    closeButton.id = id;
    closeButton.innerHTML = '&times;';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '0.625rem';
    closeButton.style.right = '0.938rem';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontWeight = 'bold';
    closeButton.style.fontSize = '1.25rem';
    modal.append(() => closeButton);
}
function createErrorMessage(modal, id) {
    const errorMessage = document.createElement('div');
    errorMessage.id = id;
    errorMessage.style.position = 'relative';
    errorMessage.style.display = 'none';
    errorMessage.style.paddingLeft = 0.5 + 'rem';
    errorMessage.style.paddingTop = 0.5 + 'rem';
    errorMessage.style.color = 'red';
    errorMessage.style.fontSize = 'x-small';
    modal.append(() => errorMessage);
}

var cjsExports$1 = {};
var cjs$1 = {
  get exports(){ return cjsExports$1; },
  set exports(v){ cjsExports$1 = v; },
};

var cjsExports = {};
var cjs = {
  get exports(){ return cjsExports; },
  set exports(v){ cjsExports = v; },
};

(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.ParsingError = void 0;
	class ParsingError extends Error {
	    constructor(message, cause) {
	        super(message);
	        this.cause = cause;
	    }
	}
	exports.ParsingError = ParsingError;
	let parsingState;
	function nextChild() {
	    return element(false) || text() || comment() || cdata() || processingInstruction();
	}
	function nextRootChild() {
	    match(/\s*/);
	    return element(true) || comment() || doctype() || processingInstruction();
	}
	function parseDocument() {
	    const declaration = processingInstruction();
	    const children = [];
	    let documentRootNode;
	    let child = nextRootChild();
	    while (child) {
	        if (child.node.type === 'Element') {
	            if (documentRootNode) {
	                throw new Error('Found multiple root nodes');
	            }
	            documentRootNode = child.node;
	        }
	        if (!child.excluded) {
	            children.push(child.node);
	        }
	        child = nextRootChild();
	    }
	    if (!documentRootNode) {
	        throw new ParsingError('Failed to parse XML', 'Root Element not found');
	    }
	    if (parsingState.xml.length !== 0) {
	        throw new ParsingError('Failed to parse XML', 'Not Well-Formed XML');
	    }
	    return {
	        declaration: declaration ? declaration.node : null,
	        root: documentRootNode,
	        children
	    };
	}
	function processingInstruction() {
	    const m = match(/^<\?([\w-:.]+)\s*/);
	    if (!m)
	        return;
	    // tag
	    const node = {
	        name: m[1],
	        type: 'ProcessingInstruction',
	        content: ''
	    };
	    const endMarkerIndex = parsingState.xml.indexOf('?>');
	    if (endMarkerIndex > -1) {
	        node.content = parsingState.xml.substring(0, endMarkerIndex).trim();
	        parsingState.xml = parsingState.xml.slice(endMarkerIndex);
	    }
	    else {
	        throw new ParsingError('Failed to parse XML', 'ProcessingInstruction closing tag not found');
	    }
	    match(/\?>/);
	    return {
	        excluded: parsingState.options.filter(node) === false,
	        node
	    };
	}
	function element(matchRoot) {
	    const m = match(/^<([^?!</>\s]+)\s*/);
	    if (!m)
	        return;
	    // name
	    const node = {
	        type: 'Element',
	        name: m[1],
	        attributes: {},
	        children: []
	    };
	    const excluded = matchRoot ? false : parsingState.options.filter(node) === false;
	    // attributes
	    while (!(eos() || is('>') || is('?>') || is('/>'))) {
	        const attr = attribute();
	        if (attr) {
	            node.attributes[attr.name] = attr.value;
	        }
	        else {
	            return;
	        }
	    }
	    // self closing tag
	    if (match(/^\s*\/>/)) {
	        node.children = null;
	        return {
	            excluded,
	            node
	        };
	    }
	    match(/\??>/);
	    // children
	    let child = nextChild();
	    while (child) {
	        if (!child.excluded) {
	            node.children.push(child.node);
	        }
	        child = nextChild();
	    }
	    // closing
	    if (parsingState.options.strictMode) {
	        const closingTag = `</${node.name}>`;
	        if (parsingState.xml.startsWith(closingTag)) {
	            parsingState.xml = parsingState.xml.slice(closingTag.length);
	        }
	        else {
	            throw new ParsingError('Failed to parse XML', `Closing tag not matching "${closingTag}"`);
	        }
	    }
	    else {
	        match(/^<\/[\w-:.\u00C0-\u00FF]+\s*>/);
	    }
	    return {
	        excluded,
	        node
	    };
	}
	function doctype() {
	    const m = match(/^<!DOCTYPE\s+\S+\s+SYSTEM[^>]*>/) ||
	        match(/^<!DOCTYPE\s+\S+\s+PUBLIC[^>]*>/) ||
	        match(/^<!DOCTYPE\s+\S+\s*\[[^\]]*]>/) ||
	        match(/^<!DOCTYPE\s+\S+\s*>/);
	    if (m) {
	        const node = {
	            type: 'DocumentType',
	            content: m[0]
	        };
	        return {
	            excluded: parsingState.options.filter(node) === false,
	            node
	        };
	    }
	}
	function cdata() {
	    if (parsingState.xml.startsWith('<![CDATA[')) {
	        const endPositionStart = parsingState.xml.indexOf(']]>');
	        if (endPositionStart > -1) {
	            const endPositionFinish = endPositionStart + 3;
	            const node = {
	                type: 'CDATA',
	                content: parsingState.xml.substring(0, endPositionFinish)
	            };
	            parsingState.xml = parsingState.xml.slice(endPositionFinish);
	            return {
	                excluded: parsingState.options.filter(node) === false,
	                node
	            };
	        }
	    }
	}
	function comment() {
	    const m = match(/^<!--[\s\S]*?-->/);
	    if (m) {
	        const node = {
	            type: 'Comment',
	            content: m[0]
	        };
	        return {
	            excluded: parsingState.options.filter(node) === false,
	            node
	        };
	    }
	}
	function text() {
	    const m = match(/^([^<]+)/);
	    if (m) {
	        const node = {
	            type: 'Text',
	            content: m[1]
	        };
	        return {
	            excluded: parsingState.options.filter(node) === false,
	            node
	        };
	    }
	}
	function attribute() {
	    const m = match(/([^=]+)\s*=\s*("[^"]*"|'[^']*'|[^>\s]+)\s*/);
	    if (m) {
	        return {
	            name: m[1].trim(),
	            value: stripQuotes(m[2].trim())
	        };
	    }
	}
	function stripQuotes(val) {
	    return val.replace(/^['"]|['"]$/g, '');
	}
	/**
	 * Match `re` and advance the string.
	 */
	function match(re) {
	    const m = parsingState.xml.match(re);
	    if (m) {
	        parsingState.xml = parsingState.xml.slice(m[0].length);
	        return m;
	    }
	}
	/**
	 * End-of-source.
	 */
	function eos() {
	    return 0 === parsingState.xml.length;
	}
	/**
	 * Check for `prefix`.
	 */
	function is(prefix) {
	    return 0 === parsingState.xml.indexOf(prefix);
	}
	/**
	 * Parse the given XML string into an object.
	 */
	function parseXml(xml, options = {}) {
	    xml = xml.trim();
	    const filter = options.filter || (() => true);
	    parsingState = {
	        xml,
	        options: Object.assign(Object.assign({}, options), { filter, strictMode: options.strictMode === true })
	    };
	    return parseDocument();
	}
	{
	    module.exports = parseXml;
	}
	exports.default = parseXml;
	
} (cjs, cjsExports));

(function (module, exports) {
	var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
	    return (mod && mod.__esModule) ? mod : { "default": mod };
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	const xml_parser_xo_1 = __importDefault(cjsExports);
	function newLine(state) {
	    if (!state.options.indentation && !state.options.lineSeparator)
	        return;
	    state.content += state.options.lineSeparator;
	    let i;
	    for (i = 0; i < state.level; i++) {
	        state.content += state.options.indentation;
	    }
	}
	function indent(state) {
	    state.content = state.content.replace(/ +$/, '');
	    let i;
	    for (i = 0; i < state.level; i++) {
	        state.content += state.options.indentation;
	    }
	}
	function appendContent(state, content) {
	    state.content += content;
	}
	function processNode(node, state, preserveSpace) {
	    if (node.type === 'Element') {
	        processElementNode(node, state, preserveSpace);
	    }
	    else if (node.type === 'ProcessingInstruction') {
	        processProcessingIntruction(node, state);
	    }
	    else if (typeof node.content === 'string') {
	        processContent(node.content, state, preserveSpace);
	    }
	    else {
	        throw new Error('Unknown node type: ' + node.type);
	    }
	}
	function processContent(content, state, preserveSpace) {
	    if (!preserveSpace) {
	        const trimmedContent = content.trim();
	        if (state.options.lineSeparator) {
	            content = trimmedContent;
	        }
	        else if (trimmedContent.length === 0) {
	            content = trimmedContent;
	        }
	    }
	    if (content.length > 0) {
	        if (!preserveSpace && state.content.length > 0) {
	            newLine(state);
	        }
	        appendContent(state, content);
	    }
	}
	function isPathMatchingIgnoredPaths(path, ignoredPaths) {
	    const fullPath = '/' + path.join('/');
	    const pathLastPart = path[path.length - 1];
	    return ignoredPaths.includes(pathLastPart) || ignoredPaths.includes(fullPath);
	}
	function processElementNode(node, state, preserveSpace) {
	    state.path.push(node.name);
	    if (!preserveSpace && state.content.length > 0) {
	        newLine(state);
	    }
	    appendContent(state, '<' + node.name);
	    processAttributes(state, node.attributes);
	    if (node.children === null || (state.options.forceSelfClosingEmptyTag && node.children.length === 0)) {
	        const selfClosingNodeClosingTag = state.options.whiteSpaceAtEndOfSelfclosingTag ? ' />' : '/>';
	        // self-closing node
	        appendContent(state, selfClosingNodeClosingTag);
	    }
	    else if (node.children.length === 0) {
	        // empty node
	        appendContent(state, '></' + node.name + '>');
	    }
	    else {
	        const nodeChildren = node.children;
	        appendContent(state, '>');
	        state.level++;
	        let nodePreserveSpace = node.attributes['xml:space'] === 'preserve' || preserveSpace;
	        let ignoredPath = false;
	        if (!nodePreserveSpace && state.options.ignoredPaths) {
	            ignoredPath = isPathMatchingIgnoredPaths(state.path, state.options.ignoredPaths);
	            nodePreserveSpace = ignoredPath;
	        }
	        if (!nodePreserveSpace && state.options.collapseContent) {
	            let containsTextNodes = false;
	            let containsTextNodesWithLineBreaks = false;
	            let containsNonTextNodes = false;
	            nodeChildren.forEach(function (child, index) {
	                if (child.type === 'Text') {
	                    if (child.content.includes('\n')) {
	                        containsTextNodesWithLineBreaks = true;
	                        child.content = child.content.trim();
	                    }
	                    else if ((index === 0 || index === nodeChildren.length - 1) && !preserveSpace) {
	                        if (child.content.trim().length === 0) {
	                            // If the text node is at the start or end and is empty, it should be ignored when formatting
	                            child.content = '';
	                        }
	                    }
	                    // If there is some content or whitespaces have been removed and there is no other siblings
	                    if (child.content.trim().length > 0 || nodeChildren.length === 1) {
	                        containsTextNodes = true;
	                    }
	                }
	                else if (child.type === 'CDATA') {
	                    containsTextNodes = true;
	                }
	                else {
	                    containsNonTextNodes = true;
	                }
	            });
	            if (containsTextNodes && (!containsNonTextNodes || !containsTextNodesWithLineBreaks)) {
	                nodePreserveSpace = true;
	            }
	        }
	        nodeChildren.forEach(function (child) {
	            processNode(child, state, preserveSpace || nodePreserveSpace);
	        });
	        state.level--;
	        if (!preserveSpace && !nodePreserveSpace) {
	            newLine(state);
	        }
	        if (ignoredPath) {
	            indent(state);
	        }
	        appendContent(state, '</' + node.name + '>');
	    }
	    state.path.pop();
	}
	function processAttributes(state, attributes) {
	    Object.keys(attributes).forEach(function (attr) {
	        const escaped = attributes[attr].replace(/"/g, '&quot;');
	        appendContent(state, ' ' + attr + '="' + escaped + '"');
	    });
	}
	function processProcessingIntruction(node, state) {
	    if (state.content.length > 0) {
	        newLine(state);
	    }
	    appendContent(state, '<?' + node.name);
	    appendContent(state, ' ' + node.content.trim());
	    appendContent(state, '?>');
	}
	/**
	 * Converts the given XML into human readable format.
	 */
	function formatXml(xml, options = {}) {
	    options.indentation = 'indentation' in options ? options.indentation : '    ';
	    options.collapseContent = options.collapseContent === true;
	    options.lineSeparator = 'lineSeparator' in options ? options.lineSeparator : '\r\n';
	    options.whiteSpaceAtEndOfSelfclosingTag = options.whiteSpaceAtEndOfSelfclosingTag === true;
	    options.throwOnFailure = options.throwOnFailure !== false;
	    try {
	        const parsedXml = (0, xml_parser_xo_1.default)(xml, { filter: options.filter, strictMode: options.strictMode });
	        const state = { content: '', level: 0, options: options, path: [] };
	        if (parsedXml.declaration) {
	            processProcessingIntruction(parsedXml.declaration, state);
	        }
	        parsedXml.children.forEach(function (child) {
	            processNode(child, state, false);
	        });
	        if (!options.lineSeparator) {
	            return state.content;
	        }
	        return state.content
	            .replace(/\r\n/g, '\n')
	            .replace(/\n/g, options.lineSeparator);
	    }
	    catch (err) {
	        if (options.throwOnFailure) {
	            throw err;
	        }
	        return xml;
	    }
	}
	formatXml.minify = (xml, options = {}) => {
	    return formatXml(xml, Object.assign(Object.assign({}, options), { indentation: '', lineSeparator: '' }));
	};
	{
	    module.exports = formatXml;
	}
	exports.default = formatXml;
	
} (cjs$1, cjsExports$1));

var xmlFormat = /*@__PURE__*/getDefaultExportFromCjs(cjsExports$1);

function setActivePathLinesToDownload(svg) {
    svg.append('g')
        .attr('class', 'active')
        .style('opacity', '0.5')
        .style('stroke', 'rgba(0, 129, 175, 0.8)')
        .style('stroke-width', '0.1rem')
        .style('fill', 'none')
        .selectAll('path')
        .data(parcoords.data)
        .enter()
        .append('path')
        .attr('id', (d) => {
        return cleanString(d[key]);
    })
        .each(function (d) {
        select(this)
            .attr('d', linePath(d, parcoords.newFeatures));
    });
    const records = getAllRecords();
    records.forEach(element => {
        const cleanRecord = cleanString(element);
        const isSelected$1 = isSelected(cleanRecord);
        if (isSelected$1) {
            svg.select('#' + cleanRecord)
                .style('stroke', 'rgb(255, 165, 0)')
                .style('opacity', '1');
        }
        const dimNameToCheck = select('#' + cleanRecord).text();
        if (dimNameToCheck != '') {
            svg.select('#' + cleanRecord)
                .style('stroke', 'lightgrey')
                .style('stroke-opacity', '0.4');
        }
    });
}
function setFeatureAxisToDownload(svg, yAxis, yScales, xScales) {
    const orderedFeatures = parcoords.newFeatures.map((name) => ({ name }));
    const hiddenDims = getAllHiddenDimensionNames();
    let featureAxis = svg.selectAll('g.feature')
        .data(orderedFeatures)
        .enter()
        .append('g')
        .attr('transform', (d) => ('translate(' + xScales(d.name)) + ')');
    featureAxis
        .append('g')
        .each(function (d) {
        const processedDimensionName = cleanString(d.name);
        const max = getCurrentMaxRange(d.name);
        const min = getCurrentMinRange(d.name);
        if (!isDimensionCategorical(d.name)) {
            const inversionStatus = getInversionStatus(d.name);
            if (inversionStatus === 'ascending') {
                yScales[d.name].domain([min, max]);
                yAxis = setupYAxis(yScales, parcoords.newDataset, hiddenDims);
                select(this)
                    .attr('id', 'dimension_axis_' + processedDimensionName)
                    .call(yAxis[d.name]
                    .scale(yScales[d.name]
                    .domain(yScales[d.name]
                    .domain())));
            }
            else {
                yScales[d.name].domain([min, max]);
                yAxis = setupYAxis(yScales, parcoords.newDataset, hiddenDims);
                select(this)
                    .attr('id', 'dimension_axis_' + processedDimensionName)
                    .call(yAxis[d.name]
                    .scale(yScales[d.name]
                    .domain(yScales[d.name]
                    .domain().reverse())));
            }
        }
        else {
            select(this)
                .attr('id', 'dimension_axis_' + processedDimensionName)
                .call(yAxis[d.name]);
        }
    });
    featureAxis
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('y', (80 / 1.7).toFixed(4))
        .text((d) => d.name.length > 10 ? d.name.substr(0, 10) + '...' : d.name)
        .style('font-size', '0.7rem');
    setBrushDownToDownload(featureAxis);
    setBrushUpToDownload(featureAxis);
    setRectToDragToDownload(featureAxis);
    setInvertIconToDownload(featureAxis);
}
function setBrushDownToDownload(featureAxis) {
    featureAxis
        .each(function (d) {
        const processedDimensionName = cleanString(d.name);
        const item = parcoords.currentPosOfDims.find((object) => object.key == d.name);
        select(this)
            .append('g')
            .append('use')
            .attr('id', 'triangle_down_' + processedDimensionName)
            .attr('y', item.top == 80 ? 70 : item.top - 10)
            .attr('x', -6)
            .attr('width', 14)
            .attr('height', 10)
            .attr('href', '#brush_image_bottom');
    });
}
function setBrushUpToDownload(featureAxis) {
    featureAxis
        .each(function (d) {
        const processedDimensionName = cleanString(d.name);
        const item = parcoords.currentPosOfDims.find((object) => object.key == d.name);
        select(this)
            .append('g')
            .append('use')
            .attr('id', 'triangle_up_' + processedDimensionName)
            .attr('y', item.bottom)
            .attr('x', -6)
            .attr('width', 14)
            .attr('height', 10)
            .attr('href', '#brush_image_top');
    });
}
function setRectToDragToDownload(featureAxis) {
    featureAxis
        .each(function (d) {
        const processedDimensionName = cleanString(d.name);
        const item = parcoords.currentPosOfDims.find((object) => object.key == d.name);
        let height = item.bottom - item.top;
        select(this)
            .append('g')
            .append('rect')
            .attr('id', 'rect_' + processedDimensionName)
            .attr('width', 12)
            .attr('height', height)
            .attr('x', -6)
            .attr('y', item.top)
            .attr('fill', 'rgb(255, 255, 0)')
            .attr('opacity', '0.4');
    });
}
function setInvertIconToDownload(featureAxis) {
    let value = (80 / 1.5).toFixed(4);
    featureAxis
        .append('svg')
        .attr('y', value)
        .attr('x', -6)
        .append('use')
        .attr('width', 12)
        .attr('height', 12)
        .attr('y', 0)
        .attr('x', 0)
        .each(function (d) {
        const processedDimensionName = cleanString(d.name);
        if (getInversionStatus(processedDimensionName) == 'descending') {
            select(this)
                .attr('href', '#arrow_image_down');
        }
        else {
            select(this)
                .attr('href', '#arrow_image_up');
        }
    });
}

function createSvgString() {
    const orderedFeatures = parcoords.newFeatures.map((name) => ({ name }));
    const hiddenDims = getAllHiddenDimensionNames();
    let yScalesForDownload = setupYScales(parcoords.features, parcoords.newDataset);
    let yAxisForDownload = setupYAxis(yScalesForDownload, parcoords.newDataset, hiddenDims);
    let xScalesForDownload = setupXScales(orderedFeatures);
    let svg = create$1('svg')
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .attr("xmlns:xlink", "http://www.w3.org/1999/xlink")
        .attr('viewBox', [0, 0, width, height])
        .attr('font-family', 'Verdana, sans-serif');
    let defs = svg.append('defs');
    defs.append('image')
        .attr('id', 'arrow_image_up')
        .attr('width', 12)
        .attr('height', 12)
        .attr('href', 'data:image/svg+xml;,' + getArrowUp());
    defs.append('image')
        .attr('id', 'arrow_image_down')
        .attr('width', 12)
        .attr('height', 12)
        .attr('href', 'data:image/svg+xml;,' + getArrowDown());
    defs.append('image')
        .attr('id', 'brush_image_top')
        .attr('width', 14)
        .attr('height', 10)
        .attr('href', 'data:image/svg+xml;,' + getArrowTop());
    defs.append('image')
        .attr('id', 'brush_image_bottom')
        .attr('width', 14)
        .attr('height', 10)
        .attr('href', 'data:image/svg+xml;,' + getArrowBottom());
    setFeatureAxisToDownload(svg, yAxisForDownload, yScalesForDownload, xScalesForDownload);
    setActivePathLinesToDownload(svg);
    return svg.node().outerHTML;
}
function saveAsSvg() {
    let svgString = createSvgString();
    let svgArrowUp = encodeURIComponent(getArrowUp());
    let svgArrowDown = encodeURIComponent(getArrowDown());
    let svgArrowBottom = encodeURIComponent(getArrowBottom());
    let svgArrowTop = encodeURIComponent(getArrowTop());
    let regexUp = /<image id="arrow_image_up"[^>]*href="data:image\/svg\+xml[^"]*">/g;
    let regexDown = /<image id="arrow_image_down"[^>]*href="data:image\/svg\+xml[^"]*">/g;
    let regexTop = /<image id="brush_image_top"[^>]*href="data:image\/svg\+xml[^"]*">/g;
    let regexBottom = /<image id="brush_image_bottom"[^>]*href="data:image\/svg\+xml[^"]*">/g;
    svgString = svgString.replaceAll(regexUp, getImageTag("arrow_image_up", svgArrowUp));
    svgString = svgString.replaceAll(regexDown, getImageTag("arrow_image_down", svgArrowDown));
    svgString = svgString.replaceAll(regexBottom, getImageTag("brush_image_bottom", svgArrowBottom));
    svgString = svgString.replaceAll(regexTop, getImageTag("brush_image_top", svgArrowTop));
    setOptionsAndDownload(svgString);
}
function setOptionsAndDownload(svgString) {
    let name = 'parcoords.svg';
    const modalOverlay = document.createElement('div');
    modalOverlay.style.position = 'fixed';
    modalOverlay.style.top = '0';
    modalOverlay.style.left = '0';
    modalOverlay.style.width = '100vw';
    modalOverlay.style.height = '100vh';
    modalOverlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modalOverlay.style.display = 'flex';
    modalOverlay.style.justifyContent = 'center';
    modalOverlay.style.alignItems = 'center';
    modalOverlay.style.zIndex = '9999';
    const modal = document.createElement('div');
    modal.style.backgroundColor = 'white';
    modal.style.padding = '0';
    modal.style.border = '0.08rem solid gray';
    modal.style.borderRadius = '0.5rem';
    modal.style.boxShadow = '0 0 0.625rem rgba(0,0,0,0.3)';
    modal.style.textAlign = 'center';
    modal.style.minWidth = '18rem';
    const fakeheader = document.createElement('div');
    fakeheader.style.height = '0.4rem';
    fakeheader.style.background = 'lightgrey';
    fakeheader.style.borderTopLeftRadius = '0.5rem';
    fakeheader.style.borderTopRightRadius = '0.5rem';
    modal.append(fakeheader);
    const title = document.createElement('div');
    title.textContent = 'Download SVG';
    title.style.padding = '0.5rem';
    title.style.marginBottom = '0.5rem';
    title.style.background = 'lightgrey';
    title.style.textAlign = 'left';
    const closeButton = document.createElement('span');
    closeButton.innerHTML = '&times;';
    closeButton.style.padding = '0.5rem';
    closeButton.style.marginBottom = '0.5rem';
    closeButton.style.marginLeft = '9rem';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontWeight = 'bold';
    closeButton.style.fontSize = '1.25rem';
    closeButton.style.textAlign = 'right';
    title.append(closeButton);
    modal.append(title);
    const form = document.createElement('div');
    form.style.display = 'flex';
    form.style.flexDirection = 'column';
    form.style.gap = '1rem';
    const rowDecimals = document.createElement('div');
    rowDecimals.style.display = 'flex';
    rowDecimals.style.alignItems = 'center';
    rowDecimals.style.justifyContent = 'space-between';
    const label = document.createElement('label');
    label.textContent = 'Decimals places (0-10): ';
    label.style.padding = '0.35rem';
    label.style.textAlign = 'left';
    label.style.flex = '1';
    label.htmlFor = 'decimalsInput';
    const input = document.createElement('input');
    input.style.marginRight = '0.45rem';
    input.type = 'number';
    input.min = '0';
    input.max = '10';
    input.value = '2';
    input.id = 'decimalsInput';
    input.style.width = '3.125rem';
    rowDecimals.appendChild(label);
    rowDecimals.appendChild(input);
    const rowKeepClasses = document.createElement('div');
    rowKeepClasses.style.display = 'flex';
    rowKeepClasses.style.alignItems = 'center';
    rowKeepClasses.style.justifyContent = 'space-between';
    const labelKeepClasses = document.createElement('label');
    labelKeepClasses.textContent = 'Keep classes: ';
    labelKeepClasses.style.padding = '0.35rem';
    labelKeepClasses.style.flex = '1';
    labelKeepClasses.style.textAlign = 'left';
    labelKeepClasses.style.marginRight = '0.5rem';
    const inputKeepClasses = document.createElement('input');
    inputKeepClasses.type = 'checkbox';
    inputKeepClasses.id = 'keepClassesInput';
    inputKeepClasses.style.marginRight = '0.45rem';
    inputKeepClasses.checked = true;
    rowKeepClasses.appendChild(labelKeepClasses);
    rowKeepClasses.appendChild(inputKeepClasses);
    const button = document.createElement('button');
    button.textContent = 'Download';
    button.style.cursor = 'pointer';
    button.style.marginLeft = '0.5rem';
    button.style.marginTop = '0.4rem';
    button.style.marginBottom = '0.5rem';
    button.style.marginRight = '0.5rem';
    button.style.display = 'block';
    form.appendChild(rowDecimals);
    form.appendChild(rowKeepClasses);
    form.appendChild(button);
    modal.appendChild(form);
    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);
    input.focus();
    button.addEventListener('click', () => {
        const decimals = parseInt(input.value);
        if (isNaN(decimals) || decimals < 0 || decimals > 10) {
            alert('Please enter a number between 2 and 10.');
            input.focus();
            return;
        }
        let updatedSVG = roundDecimals(svgString, decimals);
        if (!inputKeepClasses.checked) {
            updatedSVG = removeClasses(updatedSVG);
        }
        let processedData = xmlFormat(updatedSVG, { indentation: '  ', collapseContent: true });
        let preface = '<?xml version="1.0" standalone="no"?>\r\n';
        let svgBlob = new Blob([preface, processedData], { type: 'image/svg+xml;charset=utf-8' });
        let svgUrl = URL.createObjectURL(svgBlob);
        let downloadLink = document.createElement('a');
        downloadLink.href = svgUrl;
        downloadLink.download = name;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        document.body.removeChild(modalOverlay);
    });
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            document.body.removeChild(modalOverlay);
        }
    });
    closeButton.addEventListener('click', () => {
        document.body.removeChild(modalOverlay);
    });
}
function getImageTag(key, svg) {
    return `<image id="${key}" width="12" height="12" href="data:image/svg+xml,${svg}">`;
}
function roundDecimals(svgString, decimals) {
    return svgString.replace(/(\d*\.\d+)/g, (match) => {
        return parseFloat(match).toFixed(decimals);
    });
}
function removeClasses(svgString) {
    return svgString.replace(/\sclass="[^"]*"/g, '');
}

function createToolbar(dataset) {
    const toolbarRow = select('#toolbarRow');
    const toggleButton = toolbarRow.append('button')
        .attr('id', 'toggleButton')
        .attr('title', 'Expand toolbar')
        .html(getExpandToolbarIcon())
        .style('margin', '0')
        .style('border', 'none')
        .style('border-radius', '10%')
        .style('padding', '0.2em')
        .style('width', '2em')
        .style('height', '2em')
        .style('cursor', 'pointer');
    const toolbar = toolbarRow.append('div')
        .attr('id', 'toolbar')
        .style('display', 'flex')
        .style('overflow', 'hidden')
        .style('max-width', '0')
        .style('opacity', '0')
        .style('transition', 'max-width 0.3s ease, opacity 0.3s ease')
        .style('pointer-events', 'none');
    toolbar.append('button')
        .attr('id', 'showData')
        .attr('title', 'Show table')
        .html(getTableIcon())
        .style('margin', '0')
        .style('border', 'none')
        .style('border-radius', '5%')
        .style('padding', '0.3em')
        .style('width', '2em')
        .style('height', '2em')
        .on('click', () => showModalWithData(dataset));
    toolbar.append('button')
        .attr('id', 'downloadButton')
        .attr('title', 'Download SVG')
        .html(getDownloadButton())
        .style('margin', '0')
        .style('border', 'none')
        .style('border-radius', '5%')
        .style('padding', '0.3em')
        .style('width', '2em')
        .style('height', '2em')
        .on('click', saveAsSvg);
    toolbar.append('button')
        .attr('id', 'refreshButton')
        .attr('title', 'Refresh')
        .html(getRefreshIcon())
        .style('margin', '0')
        .style('border', 'none')
        .style('border-radius', '5%')
        .style('padding', '0.3em')
        .style('width', '2em')
        .style('height', '2em')
        .on('click', refresh);
    toolbar.append('button')
        .attr('id', 'resetButton')
        .attr('title', 'Reset')
        .html(getResetIcon())
        .style('margin', '0')
        .style('border', 'none')
        .style('border-radius', '5%')
        .style('padding', '0.3em')
        .style('width', '2em')
        .style('height', '2em')
        .on('click', reset);
    toggleButton.on('click', () => {
        let isExpanded = toolbar.style('max-width') !== '0px';
        let expanded = !isExpanded;
        toolbar.style('max-width', expanded ? '12.5rem' : '0')
            .style('opacity', expanded ? '1' : '0')
            .style('pointer-events', expanded ? 'auto' : 'none');
        toggleButton.attr('title', expanded ? 'Collapse toolbar' : 'Expand toolbar');
        toggleButton.html(expanded ? getCollapseToolbarIcon() : getExpandToolbarIcon());
    });
}
function showModalWithData(dataset) {
    const overlay = select('body')
        .append('div')
        .attr('id', 'modalTableOverlay')
        .style('position', 'fixed')
        .style('top', 0)
        .style('left', 0)
        .style('width', '100vw')
        .style('height', '100vh')
        .style('background-color', 'rgba(0, 0, 0, 0.5)')
        .style('z-index', '999')
        .style('display', 'block');
    overlay.on('click', () => {
        overlay.style('display', 'none');
        modal.style('display', 'none');
    });
    const modal = select('body')
        .append('div')
        .attr('id', 'dataModal')
        .style('top', '50%')
        .style('left', '50%')
        .style('transform', 'translate(-50%, -50%)')
        .style('position', 'fixed')
        .style('background', 'white')
        .style('padding', '1rem')
        .style('box-shadow', '0 0 0.625rem rgba(0, 0, 0, 0.3)')
        .style('border', '0.08rem solid gray')
        .style('border-radius', '0.5rem')
        .style('max-height', '80vh')
        .style('max-width', '90vw')
        .style('z-index', '1000')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('overflow', 'hidden');
    const saveAsCSV = document.createElement('button');
    saveAsCSV.id = 'saveAsCsv';
    saveAsCSV.textContent = 'Save as CSV';
    saveAsCSV.style.marginBottom = '3rem';
    saveAsCSV.style.alignSelf = 'flex-start';
    saveAsCSV.style.width = 'auto';
    saveAsCSV.style.display = 'inline-block';
    modal.append(() => saveAsCSV);
    saveAsCSV.addEventListener('click', () => {
        const reservedArray = dataset.map((entry) => {
            const entries = Object.entries(entry).reverse();
            return Object.fromEntries(entries);
        });
        downloadCSV(reservedArray);
    });
    const closeButton = document.createElement('span');
    closeButton.innerHTML = '&times;';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '0.625rem';
    closeButton.style.right = '0.938rem';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontWeight = 'bold';
    closeButton.style.fontSize = '1.25rem';
    closeButton.style.marginBottom = '3rem';
    modal.append(() => closeButton);
    const scrollWrapper = document.createElement('div');
    scrollWrapper.style.flex = '1 1 auto';
    scrollWrapper.style.minHeight = '0';
    scrollWrapper.style.overflowY = 'auto';
    scrollWrapper.style.overflowX = 'auto';
    scrollWrapper.style.width = '100%';
    const tableContainer = document.createElement('table');
    tableContainer.style.width = '100%';
    tableContainer.style.borderCollapse = 'collapse';
    scrollWrapper.appendChild(tableContainer);
    modal.append(() => scrollWrapper);
    generateTable(dataset, tableContainer);
    closeButton.addEventListener('click', () => {
        modal.style('display', 'none');
        overlay.style('display', 'none');
    });
}
function generateTable(dataset, table) {
    table.innerHTML = '';
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    const reservedArray = dataset.map((entry) => {
        const entries = Object.entries(entry).reverse();
        return Object.fromEntries(entries);
    });
    const headers = Object.keys(reservedArray[0]);
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    headers.forEach(header => {
        const th = document.createElement('th');
        th.innerText = header.charAt(0).toUpperCase() + header.slice(1);
        th.style.border = '0.063rem solid #ddd';
        th.style.padding = '0.5rem';
        th.style.backgroundColor = 'rgb(232, 232, 158)';
        th.style.position = 'sticky';
        th.style.top = '0';
        th.style.zIndex = '1';
        th.style.whiteSpace = 'nowrap';
        th.style.overflow = 'hidden';
        th.style.textOverflow = 'ellipsis';
        const isNumericCol = reservedArray.every((row) => {
            const val = row[header];
            return !isNaN(parseFloat(val)) && isFinite(val);
        });
        th.style.textAlign = isNumericCol ? 'right' : 'left';
        headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    reservedArray.forEach((obj) => {
        const row = document.createElement('tr');
        headers.forEach(key => {
            const td = document.createElement('td');
            const value = obj[key];
            td.innerText = value;
            td.style.border = '0.063rem solid #ddd';
            td.style.padding = '0.5rem';
            if (!isNaN(parseFloat(value)) && isFinite(value)) {
                td.style.textAlign = 'right';
            }
            else {
                td.style.textAlign = 'left';
            }
            row.appendChild(td);
        });
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
}
function downloadCSV(dataset, filename = 'data.csv') {
    if (!dataset || !dataset.length)
        return;
    const keys = Object.keys(dataset[0]);
    const csvRows = [];
    csvRows.push(keys.join(','));
    dataset.forEach((row) => {
        const values = keys.map(k => {
            const value = row[k];
            return typeof value === 'string' && value.includes(',')
                ? `"${value}"`
                : value;
        });
        csvRows.push(values.join(','));
    });
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

//******** API ********//
//---------- Invert Functions ----------
function invertWoTransition(dimension) {
    const cleanDimensionName = cleanString(dimension);
    const invertId = "#dimension_invert_" + cleanDimensionName;
    const dimensionId = "#dimension_axis_" + cleanDimensionName;
    const textElement = select(invertId);
    const currentArrowStatus = textElement.text();
    const arrow = currentArrowStatus === "down" ? "#arrow_image_up" : "#arrow_image_down";
    const arrowStyle = currentArrowStatus === "down"
        ? setSize(getArrowDownCursor(), 12)
        : setSize(getArrowUpCursor(), 12);
    textElement.text(currentArrowStatus === "down" ? "up" : "down");
    textElement.attr("href", arrow);
    textElement.style("cursor", `url('data:image/svg+xml,${encodeURIComponent(arrowStyle)}') 8 8 , auto`);
    select("#invert_hitbox_" + cleanDimensionName).style("cursor", `url('data:image/svg+xml,${encodeURIComponent(arrowStyle)}') 8 8 , auto`);
    select(dimensionId).call(yAxis[dimension].scale(parcoords.yScales[dimension].domain(parcoords.yScales[dimension].domain().reverse())));
    trans(active).each(function (d) {
        select(this).attr("d", (d) => {
            return linePath(d, parcoords.newFeatures);
        });
    });
    getFilter(dimension);
    addSettingsForBrushing(dimension, isInverted(dimension));
    if (isInverted(dimension)) {
        addInvertStatus(true, dimension, "isInverted");
    }
    else {
        addInvertStatus(false, dimension, "isInverted");
    }
}
function setInversionStatus(dimension, status) {
    const cleanDimensionName = cleanString(dimension);
    const invertId = "#dimension_invert_" + cleanDimensionName;
    const dimensionId = "#dimension_axis_" + cleanDimensionName;
    const textElement = select(invertId);
    const arrow = status === "ascending" ? "#arrow_image_up" : "#arrow_image_down";
    const arrowStyle = status === "ascending"
        ? setSize(getArrowDownCursor(), 12)
        : setSize(getArrowUpCursor(), 12);
    textElement.text(status === "ascending" ? "up" : "down");
    textElement.attr("href", arrow);
    textElement.style("cursor", `url('data:image/svg+xml,${encodeURIComponent(arrowStyle)}') 8 8 , auto`);
    select("#invert_hitbox_" + cleanDimensionName).style("cursor", `url('data:image/svg+xml,${encodeURIComponent(arrowStyle)}') 8 8 , auto`);
    select(dimensionId)
        .transition()
        .duration(1000)
        .call(yAxis[dimension].scale(parcoords.yScales[dimension].domain(parcoords.yScales[dimension].domain().reverse())))
        .ease(cubicInOut);
    trans(active).each(function (d) {
        select(this)
            .transition()
            .duration(1000)
            .attr("d", (d) => {
            return linePath(d, parcoords.newFeatures);
        })
            .ease(cubicInOut);
    });
    getFilter(dimension);
    addSettingsForBrushing(dimension, isInverted(dimension));
    if (isInverted(dimension)) {
        addInvertStatus(true, dimension, "isInverted");
    }
    else {
        addInvertStatus(false, dimension, "isInverted");
    }
}
//---------- Move Functions ----------
function moveByOne(dimension, direction) {
    const indexOfDimension = parcoords.newFeatures.indexOf(dimension);
    const indexOfNeighbor = direction == "right" ? indexOfDimension - 1 : indexOfDimension + 1;
    const neighbour = parcoords.newFeatures[indexOfNeighbor];
    const pos = parcoords.xScales(dimension);
    const posNeighbour = parcoords.xScales(neighbour);
    const distance = parcoords.xScales.step();
    parcoords.dragging[dimension] =
        direction == "right" ? pos + distance : pos - distance;
    parcoords.dragging[neighbour] =
        direction == "right" ? posNeighbour - distance : posNeighbour + distance;
    if (direction == "right") {
        [
            parcoords.newFeatures[indexOfDimension],
            parcoords.newFeatures[indexOfDimension - 1],
        ] = [
            parcoords.newFeatures[indexOfDimension - 1],
            parcoords.newFeatures[indexOfDimension],
        ];
    }
    else {
        [
            parcoords.newFeatures[indexOfDimension + 1],
            parcoords.newFeatures[indexOfDimension],
        ] = [
            parcoords.newFeatures[indexOfDimension],
            parcoords.newFeatures[indexOfDimension + 1],
        ];
    }
    parcoords.xScales.domain(parcoords.newFeatures);
    let active = select("g.active").selectAll("path");
    let featureAxis = selectAll(".dimensions");
    active
        .transition()
        .duration(1000)
        .attr("d", function (d) {
        return linePath(d, parcoords.newFeatures);
    })
        .ease(cubicInOut);
    featureAxis
        .transition()
        .duration(1000)
        .attr("transform", function (d) {
        return ("translate(" +
            position(d.name, parcoords.dragging, parcoords.xScales) +
            ")");
    })
        .ease(cubicInOut);
    delete parcoords.dragging[dimension];
    delete parcoords.dragging[neighbour];
}
function move(dimensionA, toRightOf, dimensionB) {
    const indexOfDimensionA = getDimensionPosition(dimensionA);
    const indexOfDimensionB = getDimensionPosition(dimensionB);
    if (toRightOf) {
        if (indexOfDimensionA > indexOfDimensionB) {
            for (let i = indexOfDimensionA; i > indexOfDimensionB; i--) {
                if (i != indexOfDimensionB - 1) {
                    swap(parcoords.newFeatures[i], parcoords.newFeatures[i - 1]);
                }
            }
        }
        else {
            for (let i = indexOfDimensionA; i < indexOfDimensionB; i++) {
                if (i != indexOfDimensionB - 1) {
                    swap(parcoords.newFeatures[i], parcoords.newFeatures[i + 1]);
                }
            }
        }
    }
    else {
        if (indexOfDimensionA > indexOfDimensionB) {
            for (let i = indexOfDimensionA; i > indexOfDimensionB; i--) {
                if (i != indexOfDimensionB + 1) {
                    swap(parcoords.newFeatures[i], parcoords.newFeatures[i - 1]);
                }
            }
        }
        else {
            for (let i = indexOfDimensionA; i < indexOfDimensionB; i++) {
                swap(parcoords.newFeatures[i], parcoords.newFeatures[i + 1]);
            }
        }
    }
}
function swap(dimensionA, dimensionB) {
    const positionA = parcoords.xScales(dimensionA);
    const positionB = parcoords.xScales(dimensionB);
    parcoords.dragging[dimensionA] = positionB;
    parcoords.dragging[dimensionB] = positionA;
    const indexOfDimensionA = parcoords.newFeatures.indexOf(dimensionA);
    const indexOfDimensionB = parcoords.newFeatures.indexOf(dimensionB);
    [
        parcoords.newFeatures[indexOfDimensionA],
        parcoords.newFeatures[indexOfDimensionB],
    ] = [
        parcoords.newFeatures[indexOfDimensionB],
        parcoords.newFeatures[indexOfDimensionA],
    ];
    parcoords.xScales.domain(parcoords.newFeatures);
    let active = select("g.active").selectAll("path");
    let featureAxis = selectAll(".dimensions");
    active
        .transition()
        .duration(1000)
        .attr("d", (d) => {
        return linePath(d, parcoords.newFeatures);
    });
    featureAxis
        .transition()
        .duration(1000)
        .attr("transform", (d) => {
        return ("translate(" +
            position(d.name, parcoords.dragging, parcoords.xScales) +
            ")");
    })
        .ease(cubicInOut);
    delete parcoords.dragging[dimensionA];
    delete parcoords.dragging[dimensionB];
}
//---------- Selection Functions ----------
function getSelected() {
    let selected = [];
    const records = getAllRecords();
    for (let i = 0; i < records.length; i++) {
        let isselected = isSelected(records[i]);
        if (isselected) {
            selected.push(records[i]);
        }
    }
    return selected;
}
function setSelection(records) {
    // console.log("Triggered setSelection")
    for (let i = 0; i < records.length; i++) {
        let stroke = select("#" + cleanString(records[i])).style("stroke");
        if (stroke !== "lightgrey") {
            select("#" + cleanString(records[i]))
                .classed("selected", true)
                .transition()
                .style("stroke", "rgba(255, 165, 0, 1)");
            //const data = parcoords.data.find(d => d.Name === records[i]);
            //helper.createToolTipForValues(data, String(i));
        }
    }
}
function toggleSelection(record) {
    // console.log("Triggered toggleSelection for record:", record);
    const selected = isSelected(record);
    if (selected) {
        setUnselected(record);
    }
    else {
        setSelected(record);
    }
}
function setSelected(record) {
    // console.log("Triggered setSelected for record:", record);
    let selectableLines = [];
    selectableLines.push(record);
    setSelection(selectableLines);
}
function setUnselected(record) {
    // console.log("Triggered setUnselected for record:", record);
    selectAll("#" + cleanString(record))
        .classed("selected", false)
        .transition()
        .style("stroke", "rgba(0, 129, 175, 0.5)");
}
function isRecordInactive(record) {
    // console.log("Triggered isRecordInactive for record:", record);
    const stroke = select("#" + cleanString(record));
    let node = stroke.node();
    let style = node.style.stroke;
    return style === "rgba(211, 211, 211, 0.4)" ? true : false;
}
//---------- Selection Functions With IDs ----------
function setSelectionWithId(recordIds) {
    // console.log("Triggered setSelectionWithId for recordIds:", recordIds);
    let records = [];
    for (let i = 0; i < recordIds.length; i++) {
        let record = getRecordWithId(recordIds[i]);
        records.push(record);
    }
    setSelection(records);
}
function isSelectedWithRecordId(recordId) {
    // console.log("Triggered isSelectedWithRecordId for recordId:", recordId);
    let record = getRecordWithId(recordId);
    return isSelected(record);
}
function getRecordWithId(recordId) {
    // console.log("Triggered getRecordWithId for recordId:", recordId);
    const item = parcoords.currentPosOfDims.find((object) => object.recordId == recordId);
    return item.key;
}
function toggleSelectionWithId(recordId) {
    // console.log("Triggered toggleSelectionWithId for recordId:", recordId);
    const record = getRecordWithId(recordId);
    toggleSelection(record);
}
function setSelectedWithId(recordId) {
    // console.log("Triggered setSelectedWithId for recordId:", recordId);
    const record = getRecordWithId(recordId);
    setSelected(record);
}
function setUnselectedWithId(recordId) {
    // console.log("Triggered setUnselectedWithId for recordId:", recordId);
    const record = getRecordWithId(recordId);
    setUnselected(record);
}
function createHiDPICanvas(plot, w, h) {
    // console.log("Triggered createHiDPICanvas with width:", w, "and height:", h);
    const el = plot
        .append("canvas")
        .attr("id", "pc_canvas")
        .style("position", "absolute")
        .style("left", "0px")
        .style("top", "0px")
        .style("pointer-events", "none")
        .node();
    const dpr = window.devicePixelRatio || 1;
    el.width = Math.floor(w * dpr);
    el.height = Math.floor(h * dpr);
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    setCanvasEl(el);
    return { dpr };
}
function recreateCanvas() {
    // console.log("Triggered recreateCanvas");
    const plot = select("#plotArea");
    plot.select("#pc_canvas").remove();
    const { dpr } = createHiDPICanvas(plot, width, 360);
    if (currWebTech === "Canvas2D")
        initCanvas2D(dpr);
    // else if (currWebTech === "WebGPU") initCanvasWebGPU();
}
function redrawPolylines(dataset, parcoords) {
    // console.log("Triggered redrawPolylines");
    switch (currWebTech) {
        case "Canvas2D":
            recreateCanvas();
            redrawCanvasLines(dataset, parcoords);
            break;
        case "SVG-DOM":
            redrawSvgLines(svg, dataset, parcoords);
            break;
        case "WebGL":
            recreateCanvas();
            initCanvasWebGL();
            redrawWebGLLines(dataset, parcoords);
            break;
        case "WebGPU":
            // recreateCanvas();
            // console.log("Using WebGPU rendering");
            // initCanvasWebGPU()
            //   .then(() => {
            //     redrawWebGPULines(dataset, parcoords);
            //   })
            //   .catch((err) => console.error("WebGPU init failed:", err));
            redrawWebGPULines(dataset, parcoords);
            break;
    }
}
function runPolylineBenchmark(iters) {
    if (!iters || iters <= 0) {
        console.warn("runPolylineBenchmark: iterations not set or <= 0");
        return null;
    }
    let totalTime = 0;
    for (let i = 0; i < iters; i++) {
        const t0 = performance.now();
        redrawPolylines(parcoords.newDataset, parcoords);
        const t1 = performance.now();
        totalTime += t1 - t0;
    }
    const avg = totalTime / iters;
    setBenchmarkData({
        numOfIterations: iters,
        avgSpeedTime: avg,
    });
    return avg;
}
function drawChart(content) {
    // console.log("Triggered drawChart");
    setRefreshData(structuredClone(content));
    deleteChart();
    const newFeatures = content.columns.reverse();
    setUpParcoordData(content, newFeatures);
    const w = width;
    const h = 360;
    // container
    let wrapper = select("#parallelcoords");
    if (wrapper.empty()) {
        wrapper = select(document.body).append("div").attr("id", "parallelcoords");
    }
    wrapper
        .style("display", "block")
        .style("width", "100%")
        .style("margin", "0")
        .style("padding", "0")
        .style("text-align", "left");
    // chart wrapper + toolbar
    const chartWrapper = wrapper
        .append("div")
        .attr("id", "chartWrapper")
        .style("display", "block")
        .style("width", "100%");
    chartWrapper
        .append("div")
        .attr("id", "toolbarRow")
        .style("display", "flex")
        .style("flex-wrap", "wrap")
        .style("align-items", "center")
        .style("justify-content", "flex-start")
        .style("margin", "1.2rem 0 0 1rem");
    createToolbar(parcoords.newDataset);
    // plot area
    const plot = chartWrapper
        .append("div")
        .attr("id", "plotArea")
        .style("position", "relative")
        .style("width", `${w}px`)
        .style("height", `${h}px`);
    const res = createHiDPICanvas(plot, w, h);
    const dpr = res.dpr;
    // svg
    setSvg(plot
        .append("svg")
        .attr("id", "pc_svg")
        .attr("viewBox", `0 0 ${w} ${h}`)
        .attr("font-family", "Verdana, sans-serif")
        .attr("width", w)
        .attr("height", h)
        .style("position", "absolute")
        .style("left", "0px")
        .style("top", "0px")
        .style("display", "block"));
    setDefsForIcons();
    setFeatureAxis(svg, yAxis, parcoords, w);
    switch (currWebTech) {
        case "Canvas2D":
            initCanvas2D(dpr);
            redrawCanvasLines(parcoords.newDataset, parcoords);
            break;
        case "SVG-DOM":
            // The setActivePathLines function call is causing interactivity in SVG mode
            setActive(setActivePathLines(svg, content, parcoords));
            svg
                .on("contextmenu", (event) => {
                event.stopPropagation();
                event.preventDefault();
            })
                .on("mouseenter", () => cleanTooltip())
                .on("click", () => clearSelection())
                .on("mousedown.selection", (event) => event.preventDefault());
            break;
        case "WebGL":
            // console.log("Using WebGL rendering");
            initCanvasWebGL();
            redrawWebGLLines(parcoords.newDataset, parcoords);
            break;
        case "WebGPU":
            // console.log("Using WebGPU rendering from DrawChart");
            // setActive(setActivePathLines(svg, content, parcoords));
            initCanvasWebGPU()
                .then(() => {
                redrawWebGPULines(parcoords.newDataset, parcoords);
            })
                .catch((err) => console.error("WebGPU init failed:", err));
            break;
    }
    window.onclick = () => {
        select("#contextmenu").style("display", "none");
        select("#contextmenuRecords").style("display", "none");
    };
}
function reset() {
    // console.log("Triggered reset");
    drawChart(refreshData);
    let toolbar = select("#toolbar");
    toolbar
        .style("max-width", "12.5rem")
        .style("opacity", "1")
        .style("pointer-events", "auto");
    let toggleButton = select("#toggleButton");
    toggleButton.attr("title", "Collapse toolbar");
    toggleButton.html(getCollapseToolbarIcon());
}
function refresh() {
    const dimensions = getAllVisibleDimensionNames();
    for (let i = 0; i < dimensions.length; i++) {
        show(dimensions[i]);
    }
}
function deleteChart() {
    // console.log("Triggered deleteChart");
    const wrapper = select("#parallelcoords");
    wrapper.selectAll("*").remove();
    select("#pc_svg").remove();
    select("#contextmenu").remove();
    select("#contextmenuRecords").remove();
    select("#modalFilter").remove();
    select("#modalRange").remove();
    select("#refreshButton").remove();
    select("#showData").remove();
    select("#toolbarRow").remove();
    parcoords.currentPosOfDims.length = 0;
    select("#pc_canvas").remove();
    setCanvasEl(null);
}
//---------- Helper Functions ----------
// ---------- Needed for Built-In Interactivity Functions ---------- //
function setUpParcoordData(data, newFeatures) {
    // console.log("Triggered setUpParcoordData");
    setPadding(60);
    setPaddingXaxis(60);
    if (newFeatures.length <= 6) {
        setWidth(newFeatures.length * 180);
    }
    else {
        setWidth(newFeatures.length * 100);
    }
    setHeight(400);
    setInitDimension(newFeatures);
    const label = newFeatures[newFeatures.length - 1];
    data.sort((a, b) => {
        const item1 = a[label];
        const item2 = b[label];
        if (item1 < item2) {
            return -1;
        }
        else if (item1 > item2) {
            return 1;
        }
        else {
            return 0;
        }
    });
    let dataset = prepareData(data, newFeatures);
    setFeatures(dataset[0]);
    setNewDataset(dataset[1]);
    setXScales(setupXScales(dataset[0]));
    setYScales(setupYScales(dataset[0], dataset[1]));
    setNewFeatures(newFeatures);
    setData(data);
    for (let i = 0; i < newFeatures.length; i++) {
        let max;
        let min;
        if (isNaN(Math.max(...parcoords.newDataset.map((o) => o[newFeatures[i]])))) {
            const sorted = [
                ...parcoords.newDataset.map((o) => o[newFeatures[i]]),
            ].sort((a, b) => a.localeCompare(b));
            min = sorted[sorted.length - 1];
            max = sorted[0];
        }
        else {
            max = Math.max(...parcoords.newDataset.map((o) => o[newFeatures[i]]));
            min = Math.min(...parcoords.newDataset.map((o) => o[newFeatures[i]]));
        }
        const ranges = getDimensionRange(newFeatures[i]);
        parcoords.currentPosOfDims.push({
            key: newFeatures[i],
            top: 80,
            bottom: 320,
            isInverted: false,
            index: i,
            min: min,
            max: max,
            sigDig: 0,
            currentRangeTop: ranges[1],
            currentRangeBottom: ranges[0],
            currentFilterBottom: ranges[0],
            currentFilterTop: ranges[1],
        });
    }
    const hiddenDims = getAllHiddenDimensionNames();
    setYaxis(setupYAxis(parcoords.yScales, parcoords.newDataset, hiddenDims));
    let counter = 0;
    parcoords.features.map((x) => {
        let numberOfDigs = 0;
        let values = parcoords.newDataset.map((o) => o[x.name]);
        for (let i = 0; i < values.length; i++) {
            if (!isNaN(values[i])) {
                const tempNumberOfDigs = digits(Number(values[i]));
                if (tempNumberOfDigs > numberOfDigs) {
                    numberOfDigs = tempNumberOfDigs;
                }
            }
            else {
                continue;
            }
        }
        addNumberOfDigs(numberOfDigs, parcoords.currentPosOfDims, x.name, "sigDig");
        addNumberOfDigs(counter, parcoords.currentPosOfDims, x.name, "recordId");
        counter = counter + 1;
    });
    setHoverLabel(getAllVisibleDimensionNames()[0]);
}
const tooltipPath = select("body")
    .append("div")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("pointer-events", "none")
    .style("background", "rgba(0,0,0,0.8)")
    .style("color", "#fff")
    .style("padding", "0.5rem")
    .style("border-radius", "0.25rem")
    .style("font-size", "0.75rem")
    .style("z-index", "1000");
const tooltipTest = select("body")
    .append("div")
    .attr("id", "tooltipTest")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("pointer-events", "none")
    .style("background", "lightgrey")
    .style("padding", "0.2rem")
    .style("border", "1px solid gray")
    .style("border-radius", "0.2rem")
    .style("white-space", "pre-line")
    .style("font-size", "0.75rem")
    .style("z-index", "1000");
let cleanupTimeout = null;
const handlePointerEnter = (event, d) => {
    doNotHighlight();
    const data = getAllPointerEventsData(event);
    highlight(data);
    createTooltipForPathLine(data, tooltipTest, event);
    const datasetMap = new Map();
    parcoords.newDataset.forEach((record) => {
        datasetMap.set(record[hoverlabel], record);
    });
    data.forEach((item, i) => {
        const rec = datasetMap.get(item);
        if (rec) {
            createToolTipForValues(rec, rec.id ?? String(i));
        }
    });
};
const handlePointerLeaveOrOut = () => {
    doNotHighlight();
    tooltipPath.style("visibility", "hidden");
    select("#tooltipTest").style("visibility", "hidden");
    cleanTooltip();
};
select("#pc_svg").on("mouseleave", () => {
    if (cleanupTimeout)
        clearTimeout(cleanupTimeout);
    cleanupTimeout = setTimeout(() => {
        doNotHighlight();
        tooltipPath.style("visibility", "hidden");
        select("#tooltipTest").style("visibility", "hidden");
        cleanTooltip();
    }, 100);
});
document.addEventListener("mousemove", (e) => {
    const chartBounds = document.querySelector("#pc_svg").getBoundingClientRect();
    if (e.clientX < chartBounds.left ||
        e.clientX > chartBounds.right ||
        e.clientY < chartBounds.top ||
        e.clientY > chartBounds.bottom) {
        handlePointerLeaveOrOut();
    }
});
function setActivePathLines(svg, content, parcoords) {
    // console.log("Triggered setActivePathLines")
    let contextMenu = select("#parallelcoords")
        .append("g")
        .attr("id", "contextmenuRecords")
        .style("position", "absolute")
        .style("display", "none");
    contextMenu
        .append("div")
        .attr("id", "selectRecord")
        .attr("class", "contextmenu")
        .text("Select Record");
    contextMenu
        .append("div")
        .attr("id", "unSelectRecord")
        .attr("class", "contextmenu")
        .text("Unselect Record");
    contextMenu
        .append("div")
        .attr("id", "toggleRecord")
        .attr("class", "contextmenu")
        .text("Toggle Record");
    contextMenu
        .append("div")
        .attr("id", "addSelection")
        .attr("class", "contextmenu")
        .text("Add to Selection");
    contextMenu
        .append("div")
        .attr("id", "removeSelection")
        .attr("class", "contextmenu")
        .text("Remove from Selection");
    let active = svg
        .append("g")
        .attr("class", "active")
        .selectAll("path")
        .data(content)
        .enter()
        .append("path")
        .attr("class", (d) => {
        const keys = Object.keys(d);
        setKey(keys[0]);
        const selected_value = cleanString(d[key]);
        return "line " + selected_value;
    })
        .attr("id", (d) => {
        return cleanString(d[key]);
    })
        .each(function (d) {
        select(this).attr("d", linePath(d, parcoords.newFeatures));
    })
        .style("pointer-events", "stroke")
        .style("stroke", "rgba(0, 129, 175, 0.5)")
        .style("stroke-width", "0.12rem")
        .style("fill", "none")
        .on("pointerenter", handlePointerEnter)
        .on("pointerleave", handlePointerLeaveOrOut)
        .on("pointerout", handlePointerLeaveOrOut)
        .on("mouseenter", handlePointerEnter)
        .on("mouseout", handlePointerLeaveOrOut)
        .on("mouseleave", handlePointerLeaveOrOut)
        .on("click", function (event, d) {
        const data = getAllPointerEventsData(event);
        const selectedRecords = getSelected();
        if (event.metaKey || event.shiftKey) {
            data.forEach((record) => {
                if (selectedRecords.includes(record)) {
                    setUnselected(record);
                }
                else {
                    selectRecord([record]);
                }
            });
        }
        else if (event.ctrlKey) {
            data.forEach((record) => {
                toggleSelection(record);
            });
        }
        else {
            clearSelection();
            selectRecord(data);
        }
        event.stopPropagation();
    })
        .on("contextmenu", function (event, d) {
        setContextMenuForActiceRecords(contextMenu, event, d);
    });
    return active;
}
function redrawSvgLines(svg, content, parcoords) {
    // console.log("Redrawing SVG lines");
    svg.select("#contextmenuRecords").remove();
    svg.select("g.active").remove();
    // The following line is causing interactivity in SVG mode
    setActivePathLines(svg, content, parcoords);
}
const delay1 = 50;
const throttleShowValues = throttle(createToolTipForValues, delay1);
function setContextMenuForActiceRecords(contextMenu, event, d) {
    // console.log("Triggered setContextMenuForActiceRecords with event:", event, "and data:", d);
    const container = document.querySelector("#parallelcoords");
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    contextMenu
        .style("left", x + "px")
        .style("top", y + "px")
        .style("display", "block")
        .style("font-size", "0.75rem")
        .style("border", 0.08 + "rem solid gray")
        .style("border-radius", 0.1 + "rem")
        .style("margin", 0.5 + "rem")
        .style("padding", 0.35 + "rem")
        .style("background-color", "white")
        .style("margin-left", 0.5 + "rem")
        .style("cursor", "pointer")
        .on("click", (event) => {
        event.stopPropagation();
    });
    select("#selectRecord").on("click", (event) => {
        setSelected(d[hoverlabel]);
        event.stopPropagation();
        select("#contextmenuRecords").style("display", "none");
    });
    select("#unSelectRecord").on("click", (event) => {
        setUnselected(d[hoverlabel]);
        event.stopPropagation();
        select("#contextmenuRecords").style("display", "none");
    });
    select("#toggleRecord")
        .style("border-top", "0.08rem lightgrey solid")
        .on("click", (event) => {
        toggleSelection(d[hoverlabel]);
        event.stopPropagation();
        select("#contextmenuRecords").style("display", "none");
    });
    select("#addSelection")
        .style("border-top", "0.08rem lightgrey solid")
        .on("click", (event) => {
        let selectedRecords = [];
        selectedRecords = getSelected();
        selectedRecords.push(d[hoverlabel]);
        setSelection(selectedRecords);
        event.stopPropagation();
        select("#contextmenuRecords").style("display", "none");
    });
    select("#removeSelection").on("click", (event) => {
        setUnselected(d[hoverlabel]);
        event.stopPropagation();
        select("#contextmenuRecords").style("display", "none");
    });
    selectAll(".contextmenu").style("padding", 0.35 + "rem");
    event.preventDefault();
}
function setFeatureAxis(svg, yAxis, parcoords, width, padding) {
    let featureAxis = svg
        .selectAll("g.feature")
        .data(parcoords.features)
        .enter()
        .append("g")
        .attr("class", "dimensions")
        .attr("transform", (d) => "translate(" + parcoords.xScales(d.name) + ")");
    select("body")
        .append("g")
        .style("position", "absolute")
        .style("visibility", "hidden");
    featureAxis.append("g").each(function (d) {
        const processedDimensionName = cleanString(d.name);
        select(this)
            .attr("id", "dimension_axis_" + processedDimensionName)
            .call(yAxis[d.name]);
        /*.on('mouseenter', function (event, d) {
                        tooltipValuesLabel.text('');
                        tooltipValuesLabel.style('top', event.clientY / 16 + 'rem').style('left', event.clientX / 16 + 'rem');
                        tooltipValuesLabel.style('font-size', '0.75rem').style('border', 0.08 + 'rem solid gray')
                            .style('border-radius', 0.1 + 'rem').style('margin', 0.5 + 'rem')
                            .style('padding', 0.12 + 'rem')
                            .style('background-color', 'lightgrey').style('margin-left', 0.5 + 'rem');
                        return tooltipValuesLabel.style('visibility', 'hidden');
                    })
                    .on('mouseout', function () {
                        return tooltipValuesLabel.style('visibility', 'hidden');
                    })*/
    });
    let tickElements = document.querySelectorAll("g.tick");
    tickElements.forEach((gElement) => {
        let transformValue = gElement.getAttribute("transform");
        let yValue = transformValue.match(/translate\(0,([^\)]+)\)/);
        if (yValue) {
            let originalValue = parseFloat(yValue[1]);
            let shortenedValue = originalValue.toFixed(4);
            gElement.setAttribute("transform", `translate(0,${shortenedValue})`);
        }
    });
    let tooltipValues = select("body")
        .append("div")
        .style("position", "absolute")
        .style("visibility", "hidden");
    let tooltipValuesTop = select("#parallelcoords")
        .append("div")
        .style("position", "absolute")
        .style("visibility", "hidden");
    let tooltipValuesDown = select("#parallelcoords")
        .append("div")
        .style("position", "absolute")
        .style("visibility", "hidden");
    const brushOverlay = svg
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", width)
        .attr("height", height)
        .style("fill", "transparent")
        .style("pointer-events", "none");
    setBrushDown(featureAxis, parcoords, tooltipValues, brushOverlay);
    setBrushUp(featureAxis, parcoords, tooltipValues, brushOverlay);
    setRectToDrag(featureAxis, svg, parcoords, tooltipValuesTop, tooltipValuesDown);
    setMarker(featureAxis);
    setContextMenu(featureAxis);
    setInvertIcon(featureAxis);
}
function showMarker(dimension) {
    // console.log("Triggered showMarker for dimension:", dimension);
    const cleanDimensionName = cleanString(dimension);
    select("#marker_" + cleanDimensionName).attr("opacity", 1);
}
function hideMarker(dimension) {
    // console.log("Triggered hideMarker for dimension:", dimension);
    const cleanDimensionName = cleanString(dimension);
    select("#marker_" + cleanDimensionName).attr("opacity", 0);
}
function setDefsForIcons() {
    // console.log("Triggered setDefsForIcons");
    const svgContainer = svg;
    let defs = svgContainer.select("defs");
    defs = svgContainer.append("defs");
    defs
        .append("image")
        .attr("id", "arrow_image_up")
        .attr("width", 12)
        .attr("height", 12)
        .attr("href", "data:image/svg+xml;," + getArrowUp());
    defs
        .append("image")
        .attr("id", "arrow_image_down")
        .attr("width", 12)
        .attr("height", 12)
        .attr("href", "data:image/svg+xml;," + getArrowDown());
    defs
        .append("image")
        .attr("id", "brush_image_top")
        .attr("width", 14)
        .attr("height", 10)
        .attr("href", "data:image/svg+xml;," + getArrowTop());
    defs
        .append("image")
        .attr("id", "brush_image_bottom")
        .attr("width", 14)
        .attr("height", 10)
        .attr("href", "data:image/svg+xml;," + getArrowBottom());
    defs
        .append("image")
        .attr("id", "brush_image_top_active")
        .attr("width", 14)
        .attr("height", 10)
        .attr("href", "data:image/svg+xml;," + getArrowTopActive());
    defs
        .append("image")
        .attr("id", "brush_image_bottom_active")
        .attr("width", 14)
        .attr("height", 10)
        .attr("href", "data:image/svg+xml;," + getArrowBottomActive());
}
// Hovering
let currentlyHighlightedItems = [];
function highlight(data) {
    const cleanedItems = data.map((item) => cleanString(item).replace(/[.,]/g, ""));
    currentlyHighlightedItems = [...cleanedItems];
    cleanedItems.forEach((item) => {
        select("#" + item)
            .transition()
            .duration(5)
            .style("stroke", "rgba(200, 28, 38, 0.7)");
    });
}
function doNotHighlight() {
    if (!currentlyHighlightedItems.length)
        return;
    currentlyHighlightedItems.forEach((item) => {
        const line = select("#" + item);
        if (line.classed("selected")) {
            line.transition().style("stroke", "rgba(255, 165, 0, 1)");
        }
        else {
            line.transition().style("stroke", "rgba(0, 129, 175, 0.5)");
        }
    });
    currentlyHighlightedItems = [];
}
// Selecting
function selectRecord(linePaths) {
    for (let i = 0; i < linePaths.length; i++) {
        setSelected(linePaths[i]);
    }
}
function clearSelection() {
    const selectedRecords = getSelected();
    selectedRecords.forEach((element) => {
        select("#" + cleanString(element))
            .classed("selected", false)
            .transition()
            .style("stroke", "rgba(0, 129, 175, 0.5)");
    });
}
function setInvertIcon(featureAxis, padding) {
    let value = (80 / 1.5).toFixed(4);
    const svg = featureAxis
        .append("svg")
        .attr("x", -6 - 22)
        .attr("y", Number(value) - 22)
        .attr("width", 44)
        .attr("height", 22)
        .style("overflow", "visible");
    svg
        .append("rect")
        .attr("id", "invert_hitbox")
        .attr("class", "hitbox")
        .attr("x", 6)
        .attr("y", 20)
        .attr("width", 44)
        .attr("height", 15)
        .attr("rx", 6)
        .attr("ry", 6)
        .attr("fill", "transparent")
        .style("pointer-events", "all")
        .each(function (d) {
        const processed = cleanString(d.name);
        select(this)
            .attr("id", "invert_hitbox_" + processed)
            .style("cursor", `url('data:image/svg+xml,${setSize(encodeURIComponent(getArrowDownCursor()), 12)}') 8 8, auto`);
    });
    svg
        .append("use")
        .attr("href", "#arrow_image_up")
        .attr("width", 12)
        .attr("height", 12)
        .attr("x", 22.5)
        .attr("y", Number(value) - 33)
        .each(function (d) {
        const processed = cleanString(d.name);
        select(this)
            .attr("id", "dimension_invert_" + processed)
            .text("up")
            .style("cursor", `url('data:image/svg+xml,${setSize(encodeURIComponent(getArrowDownCursor()), 12)}') 8 8, auto`);
    });
    svg.on("click", (event, d) => {
        invert(d.name);
        event.stopPropagation();
    });
}
function setMarker(featureAxis) {
    featureAxis.each(function (d) {
        const processedDimensionName = cleanString(d.name);
        select(this)
            .append("g")
            .attr("class", "marker")
            .append("rect")
            .attr("id", "marker_" + processedDimensionName)
            .attr("width", 44)
            .attr("height", 305)
            .attr("x", -22)
            .attr("y", 30)
            .attr("fill", "none")
            .attr("stroke", "rgb(228, 90, 15)")
            .attr("stroke-width", "0.1rem")
            .attr("opacity", "0");
    });
}
// Brushing
function setRectToDrag(featureAxis, svg, parcoords, tooltipValuesTop, tooltipValuesDown) {
    let delta;
    featureAxis.each(function (d) {
        const processedDimensionName = cleanString(d.name);
        select(this)
            .append("g")
            .attr("class", "rect")
            .append("rect")
            .attr("id", "rect_" + processedDimensionName)
            .attr("width", 12)
            .attr("height", 240)
            .attr("x", -6)
            .attr("y", 80)
            .attr("fill", "rgb(242, 242, 76)")
            .attr("opacity", "0.5")
            .style("cursor", "default")
            .call(drag()
            .on("drag", (event, d) => {
            if (parcoords.newFeatures.length > 25) {
                throttleDragAndBrush(processedDimensionName, d, event, delta, tooltipValuesTop, tooltipValuesDown, window);
            }
            else {
                dragAndBrush(processedDimensionName, d, event, delta, tooltipValuesTop, tooltipValuesDown, window);
            }
        })
            .on("start", (event, d) => {
            let current = select("#rect_" + processedDimensionName);
            delta = current.attr("y") - event.y;
        })
            .on("end", () => {
            tooltipValuesTop.style("visibility", "hidden");
            tooltipValuesDown.style("visibility", "hidden");
        }));
    });
}
function setBrushUp(featureAxis, parcoords, tooltipValues, brushOverlay) {
    featureAxis.each(function (d) {
        const processedDimensionName = cleanString(d.name);
        const g = select(this)
            .append("g")
            .attr("class", "brush_" + processedDimensionName);
        const iconY = 320, iconX = -7, iconW = 14, iconH = 10;
        g.append("use")
            .attr("id", "triangle_up_" + processedDimensionName)
            .attr("x", iconX)
            .attr("y", iconY)
            .attr("width", iconW)
            .attr("height", iconH)
            .attr("href", "#brush_image_top")
            .attr("pointer-events", "none")
            .style("cursor", `url('data:image/svg+xml,${setSize(encodeURIComponent(getArrowTopCursor()), 13)}') 8 8, auto`);
        const hit = g
            .append("rect")
            .attr("class", "handle-hitbox")
            .attr("id", "triangle_up_hit" + processedDimensionName)
            .attr("x", -15)
            .attr("y", iconY)
            .attr("width", 30)
            .attr("height", 30)
            .style("fill", "transparent")
            .style("pointer-events", "all")
            .style("touch-action", "none")
            .style("-webkit-user-select", "none")
            .style("user-select", "none")
            .style("cursor", `url('data:image/svg+xml,${setSize(encodeURIComponent(getArrowTopCursor()), 13)}') 8 8, auto`);
        function cleanup() {
            brushOverlay.style("pointer-events", "none").lower();
            tooltipValues.style("visibility", "hidden");
        }
        const makeDrag = () => drag()
            .container(function () {
            return this.ownerSVGElement || this;
        })
            .on("start", () => {
            brushOverlay.raise().style("pointer-events", "all");
            g.select("#triangle_up_" + processedDimensionName).raise();
            g.selectAll(".handle-hitbox").raise();
        })
            .on("drag", (event, dd) => {
            if (parcoords.newFeatures.length > 25) {
                throttleBrushUp(processedDimensionName, event, dd, tooltipValues, window);
            }
            else {
                brushUp(processedDimensionName, event, dd, tooltipValues, window);
            }
            const yNow = g
                .select("#triangle_up_" + processedDimensionName)
                .attr("y");
            if (yNow != null) {
                hit.attr("y", +yNow);
            }
            g.selectAll(".handle-hitbox").raise();
        })
            .on("end", () => {
            cleanup();
            requestAnimationFrame(() => {
                const newHit = g.select(".handle-hitbox");
                if (!newHit.empty())
                    newHit.call(makeDrag());
            });
        });
        hit.call(makeDrag());
    });
}
function setBrushDown(featureAxis, parcoords, tooltipValues, brushOverlay) {
    featureAxis.each(function (d) {
        const processedDimensionName = cleanString(d.name);
        const g = select(this)
            .append("g")
            .attr("class", "brush_" + processedDimensionName);
        const iconY = 70, iconX = -7, iconW = 14, iconH = 10;
        g.append("use")
            .attr("id", "triangle_down_" + processedDimensionName)
            .attr("x", iconX)
            .attr("y", iconY)
            .attr("width", iconW)
            .attr("height", iconH)
            .attr("href", "#brush_image_bottom")
            .attr("pointer-events", "none")
            .style("cursor", `url('data:image/svg+xml,${setSize(encodeURIComponent(getArrowBottomCursor()), 13)}') 8 8, auto`);
        const hit = g
            .append("rect")
            .attr("class", "handle-hitbox")
            .attr("id", "triangle_down_hit" + processedDimensionName)
            .attr("x", -15)
            .attr("y", iconY)
            .attr("width", 30)
            .attr("height", 30)
            .style("fill", "transparent")
            .style("pointer-events", "all")
            .style("touch-action", "none")
            .style("-webkit-user-select", "none")
            .style("user-select", "none")
            .style("cursor", `url('data:image/svg+xml,${setSize(encodeURIComponent(getArrowBottomCursor()), 13)}') 8 8, auto`);
        function cleanup() {
            brushOverlay.style("pointer-events", "none").lower();
            tooltipValues.style("visibility", "hidden");
        }
        const makeDrag = () => drag()
            .container(function () {
            return this.ownerSVGElement || this;
        })
            .on("start", () => {
            brushOverlay.raise().style("pointer-events", "all");
            g.select("#triangle_down_" + processedDimensionName).raise();
            g.selectAll(".handle-hitbox").raise();
        })
            .on("drag", (event, dd) => {
            if (parcoords.newFeatures.length > 25) {
                throttleBrushDown(processedDimensionName, event, dd, tooltipValues, window);
            }
            else {
                brushDown(processedDimensionName, event, dd, tooltipValues, window);
            }
            const yNow = g
                .select("#triangle_down_" + processedDimensionName)
                .attr("y");
            if (yNow != null) {
                hit.attr("y", +yNow);
            }
            g.selectAll(".handle-hitbox").raise();
        })
            .on("end", () => {
            cleanup();
            requestAnimationFrame(() => {
                const newHit = g.select(".handle-hitbox");
                if (!newHit.empty())
                    newHit.call(makeDrag());
            });
        });
        hit.call(makeDrag());
    });
}

var EOL = {},
    EOF = {},
    QUOTE = 34,
    NEWLINE = 10,
    RETURN = 13;

function objectConverter(columns) {
  return new Function("d", "return {" + columns.map(function(name, i) {
    return JSON.stringify(name) + ": d[" + i + "] || \"\"";
  }).join(",") + "}");
}

function customConverter(columns, f) {
  var object = objectConverter(columns);
  return function(row, i) {
    return f(object(row), i, columns);
  };
}

// Compute unique columns in order of discovery.
function inferColumns(rows) {
  var columnSet = Object.create(null),
      columns = [];

  rows.forEach(function(row) {
    for (var column in row) {
      if (!(column in columnSet)) {
        columns.push(columnSet[column] = column);
      }
    }
  });

  return columns;
}

function pad(value, width) {
  var s = value + "", length = s.length;
  return length < width ? new Array(width - length + 1).join(0) + s : s;
}

function formatYear(year) {
  return year < 0 ? "-" + pad(-year, 6)
    : year > 9999 ? "+" + pad(year, 6)
    : pad(year, 4);
}

function formatDate(date) {
  var hours = date.getUTCHours(),
      minutes = date.getUTCMinutes(),
      seconds = date.getUTCSeconds(),
      milliseconds = date.getUTCMilliseconds();
  return isNaN(date) ? "Invalid Date"
      : formatYear(date.getUTCFullYear()) + "-" + pad(date.getUTCMonth() + 1, 2) + "-" + pad(date.getUTCDate(), 2)
      + (milliseconds ? "T" + pad(hours, 2) + ":" + pad(minutes, 2) + ":" + pad(seconds, 2) + "." + pad(milliseconds, 3) + "Z"
      : seconds ? "T" + pad(hours, 2) + ":" + pad(minutes, 2) + ":" + pad(seconds, 2) + "Z"
      : minutes || hours ? "T" + pad(hours, 2) + ":" + pad(minutes, 2) + "Z"
      : "");
}

function dsv(delimiter) {
  var reFormat = new RegExp("[\"" + delimiter + "\n\r]"),
      DELIMITER = delimiter.charCodeAt(0);

  function parse(text, f) {
    var convert, columns, rows = parseRows(text, function(row, i) {
      if (convert) return convert(row, i - 1);
      columns = row, convert = f ? customConverter(row, f) : objectConverter(row);
    });
    rows.columns = columns || [];
    return rows;
  }

  function parseRows(text, f) {
    var rows = [], // output rows
        N = text.length,
        I = 0, // current character index
        n = 0, // current line number
        t, // current token
        eof = N <= 0, // current token followed by EOF?
        eol = false; // current token followed by EOL?

    // Strip the trailing newline.
    if (text.charCodeAt(N - 1) === NEWLINE) --N;
    if (text.charCodeAt(N - 1) === RETURN) --N;

    function token() {
      if (eof) return EOF;
      if (eol) return eol = false, EOL;

      // Unescape quotes.
      var i, j = I, c;
      if (text.charCodeAt(j) === QUOTE) {
        while (I++ < N && text.charCodeAt(I) !== QUOTE || text.charCodeAt(++I) === QUOTE);
        if ((i = I) >= N) eof = true;
        else if ((c = text.charCodeAt(I++)) === NEWLINE) eol = true;
        else if (c === RETURN) { eol = true; if (text.charCodeAt(I) === NEWLINE) ++I; }
        return text.slice(j + 1, i - 1).replace(/""/g, "\"");
      }

      // Find next delimiter or newline.
      while (I < N) {
        if ((c = text.charCodeAt(i = I++)) === NEWLINE) eol = true;
        else if (c === RETURN) { eol = true; if (text.charCodeAt(I) === NEWLINE) ++I; }
        else if (c !== DELIMITER) continue;
        return text.slice(j, i);
      }

      // Return last token before EOF.
      return eof = true, text.slice(j, N);
    }

    while ((t = token()) !== EOF) {
      var row = [];
      while (t !== EOL && t !== EOF) row.push(t), t = token();
      if (f && (row = f(row, n++)) == null) continue;
      rows.push(row);
    }

    return rows;
  }

  function preformatBody(rows, columns) {
    return rows.map(function(row) {
      return columns.map(function(column) {
        return formatValue(row[column]);
      }).join(delimiter);
    });
  }

  function format(rows, columns) {
    if (columns == null) columns = inferColumns(rows);
    return [columns.map(formatValue).join(delimiter)].concat(preformatBody(rows, columns)).join("\n");
  }

  function formatBody(rows, columns) {
    if (columns == null) columns = inferColumns(rows);
    return preformatBody(rows, columns).join("\n");
  }

  function formatRows(rows) {
    return rows.map(formatRow).join("\n");
  }

  function formatRow(row) {
    return row.map(formatValue).join(delimiter);
  }

  function formatValue(value) {
    return value == null ? ""
        : value instanceof Date ? formatDate(value)
        : reFormat.test(value += "") ? "\"" + value.replace(/"/g, "\"\"") + "\""
        : value;
  }

  return {
    parse: parse,
    parseRows: parseRows,
    format: format,
    formatBody: formatBody,
    formatRows: formatRows,
    formatRow: formatRow,
    formatValue: formatValue
  };
}

var csv = dsv(",");

var csvParse = csv.parse;

dsv("\t");

// https://github.com/d3/d3-dsv/issues/45
new Date("2019-01-01T00:00").getHours() || new Date("2019-07-01T00:00").getHours();

function loadCSV(csv) {
    let completeArray = csv.split(/\r?\n/);
    if (checkIfDuplicatesExists(completeArray[0])) {
        csv = removeDuplicateColumnNames(csv);
    }
    let tempData = csvParse(csv);
    let isComplete = checkDatasetCompleteness(tempData);
    if (!isComplete)
        return;
    return tempData.sort((a, b) => a.Name > b.Name ? 1 : -1);
}
function checkDatasetCompleteness(tempData) {
    const invalidRows = tempData.filter(d => tempData.columns.some(col => d[col] === "" || d[col] == null || d[col].trim() === ""));
    const box = document.getElementById("parallelcoords");
    if (invalidRows.length > 0) {
        box.innerHTML = `Dataset is incomplete!<br>
      <strong style="color:#e74c3c;">⚠️ ${invalidRows.length} row(s) affected:</strong>
      <pre>${JSON.stringify(invalidRows.slice(0, 5), null, 2)}</pre>
    `;
        box.style.marginLeft = "2em";
        box.style.paddingTop = "2em";
        return false;
    }
    return true;
}
function removeDuplicateColumnNames(value) {
    let completeArray = value.split(/\r?\n/);
    let column_string = csvParse(completeArray[0]);
    let n = 0;
    const unique = arr => arr.map((s => v => !s.has(v) && s.add(v) ? v : `${v}(${n += 1})`)(new Set));
    completeArray[0] = unique(column_string['columns']).toString();
    return completeArray.join('\r\n');
}
function checkIfDuplicatesExists(value) {
    return new Set(value).size !== value.length;
}

export { createSvgString, deleteChart, drawChart, getAllDatasetOptions, getAllDimensionNames, getAllHiddenDimensionNames, getAllRecords, getAllVisibleDimensionNames, getAllWebTechOptions, getBenchmarkData, getCurrentDataset, getCurrentMaxRange, getCurrentMinRange, getCurrentWebTechnologie, getDimensionPosition, getDimensionRange, getFilter, getHiddenStatus, getInversionStatus, getMaxValue, getMinValue, getNumberOfDimensions, getRecordWithId, getSelected, hide, hideMarker, invert, invertWoTransition, isDimensionCategorical, isRecordInactive, isSelected, isSelectedWithRecordId, loadCSV, move, moveByOne, recreateCanvas, redrawPolylines, redrawSvgLines, refresh, reset, runPolylineBenchmark, saveAsSvg, setCurrentDataset, setCurrentWebTechnologie, setDimensionForHovering, setDimensionRange, setDimensionRangeRounded, setFilter, setInversionStatus, setNewBenchmarkData, setSelected, setSelectedWithId, setSelection, setSelectionWithId, setUnselected, setUnselectedWithId, show, showMarker, swap, throttleShowValues, toggleSelection, toggleSelectionWithId };
//# sourceMappingURL=spcd3.js.map
