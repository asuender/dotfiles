-- Rex configuration: https://www.superlogical.com/rex/docs/customize/config
-- Mirrors .config/tmux/tmux.conf. Reload with `rex config reload`.

local HOME = os.getenv("HOME")
local SHELL = "com.superlogical.terminal.shell"
local TERMINAL = "com.superlogical.terminal"

-- Same roots as tms (~/.config/tms/config.toml)
local SEARCH_DIRS = { HOME .. "/coding", HOME .. "/mermec", HOME .. "/lmu", "/workspace" }
local BOOKMARKS = {
  HOME .. "/.config", HOME .. "/.claude", HOME .. "/coding",
  HOME .. "/videos", HOME .. "/games", HOME .. "/dotfiles",
}
local AGENTS = { "pi", "opencode", "codex", "cursor", "claude" }

-- Helpers

local function basename(path)
  return (path:gsub("/+$", ""):match("([^/]+)$"))
end

local function tilde(path)
  if path:sub(1, #HOME) == HOME then return "~" .. path:sub(#HOME + 1) end
  return path
end

-- Working directory of the focused terminal. pwd may be a file:// URL (OSC 7).
local function focused_cwd(ctx)
  local r = rex.block.call(TERMINAL, "pwd", { block_id = ctx.block_id })
  local pwd = r and r.pwd
  if pwd == nil or pwd == "" then return HOME end
  pwd = pwd:gsub("^file://[^/]*", "")
  pwd = pwd:gsub("%%(%x%x)", function(h) return string.char(tonumber(h, 16)) end)
  return pwd
end

-- Rex.app doesn't follow the server's active window, and a queued select for a
-- window created in the same action is dropped unless the app has seen it first.
-- The short sleep works around that (rex.sleep isn't available in config).
local function select_window(session_id, window_id)
  rex.client.queue("session.select", { session_id = session_id, window_id = window_id })
  rex.exec({ "sleep", "0.15" })
end

local function new_tab(ctx, label, cwd, command)
  local w, err = rex.session.new_window{
    window_label = label,
    layout = rex.layout.block{
      flavor  = SHELL,
      -- mise is activated in ~/.zshrc, which command shells don't read
      options = { cwd = cwd, command = command, path_prepend = { HOME .. "/.local/share/mise/shims" } },
    },
  }
  if err ~= nil then error(err, 0) end
  select_window(ctx.session_id, w.window_id)
end

local function list_sessions()
  local r, err = rex.call("session.list")
  if r == nil then error(err, 0) end
  return r.sessions or {}
end

local function find_session(label)
  for _, s in ipairs(list_sessions()) do
    if s.label == label then return s.session_id end
  end
end

-- Last-session tracking (tmux switch-client -l). Rex has no event for which
-- session the app shows, so only switches made through these actions count.
local LAST_SESSION_FILE = HOME .. "/.cache/rex-last-session"

local function read_last_session()
  local f = io.open(LAST_SESSION_FILE, "r")
  if f == nil then return nil end
  local id = f:read("*l")
  f:close()
  return id
end

local function write_last_session(id)
  local f = io.open(LAST_SESSION_FILE, "w")
  if f == nil then return end
  f:write(id, "\n")
  f:close()
end

-- Switch to a session (and optionally a window), remembering where we came from.
local function switch_session(ctx, session_id, window_id)
  if ctx.session_id ~= nil and ctx.session_id ~= session_id then
    write_last_session(ctx.session_id)
  end
  if window_id ~= nil then
    select_window(session_id, window_id)
  else
    rex.client.queue("session.select", { session_id = session_id })
  end
end

local function switch_to_last_session(ctx)
  local id = read_last_session()
  for _, s in ipairs(list_sessions()) do
    if s.session_id == id and id ~= ctx.session_id then
      return switch_session(ctx, id)
    end
  end
  error("No previous session to switch to", 0)
end

-- Switch to the session with this label, creating it at dir if missing.
local function open_session(ctx, label, dir)
  local id = find_session(label)
  if id == nil then
    local r, err = rex.call("session.create", {
      label = label,
      initial_windows = {
        { window_label = "shell", layout = rex.layout.block{ flavor = SHELL, options = { cwd = dir } } },
      },
    })
    if r == nil then error(err, 0) end
    return switch_session(ctx, r.session_id, r.initial_windows[1].window_id)
  end
  switch_session(ctx, id)
end

local function confirm(title)
  local answer = rex.ui.pick{ title = title, items = { "No", "Yes" } }
  return answer == "Yes"
end

-- Actions

rex.action{
  name  = "shell_tab",
  title = "New Shell Tab Here",
  run   = function(ctx) new_tab(ctx, "shell", focused_cwd(ctx)) end,
}

rex.action{
  name  = "nvim_tab",
  title = "New Neovim Tab Here",
  run   = function(ctx) new_tab(ctx, "nvim", focused_cwd(ctx), { "nvim", "." }) end,
}

rex.action{
  name  = "agent_tab",
  title = "New Agent Tab…",
  args  = { agent = "string?" },
  run   = function(ctx, args)
    local cwd = focused_cwd(ctx)
    local agent = args.agent or rex.ui.pick{ title = "Agent", items = AGENTS }
    if agent == nil then return end
    new_tab(ctx, agent, cwd, { agent })
  end,
}

rex.action{
  name  = "toggle_default_session",
  title = "Toggle Default Session",
  run   = function(ctx)
    local id = find_session("default")
    if id ~= nil and id == ctx.session_id then
      switch_to_last_session(ctx)
    else
      open_session(ctx, "default", HOME)
    end
  end,
}

rex.action{
  name  = "last_session",
  title = "Go to Last Session",
  run   = function(ctx) switch_to_last_session(ctx) end,
}

rex.action{
  name  = "session_pick",
  title = "Switch Session…",
  run   = function(ctx)
    local items = {}
    for _, s in ipairs(list_sessions()) do
      if s.session_id ~= ctx.session_id then
        items[#items + 1] = { id = s.session_id, title = s.label, icon = "terminal" }
      end
    end
    local id = rex.ui.pick{ title = "Switch session", placeholder = "Filter sessions", items = items }
    if id == nil then return end
    switch_session(ctx, id)
  end,
}

rex.action{
  name  = "project_open",
  title = "Open Project…",
  args  = { path = "string?" },
  run   = function(ctx, args)
    local dir = args.path
    if dir == nil then
      local argv = { "find" }
      for _, d in ipairs(SEARCH_DIRS) do argv[#argv + 1] = d end
      for _, a in ipairs({ "-mindepth", "2", "-maxdepth", "3", "-name", ".git", "-prune" }) do
        argv[#argv + 1] = a
      end
      -- find exits non-zero for missing roots (e.g. /workspace); use its output anyway
      local r, err = rex.exec(argv, { timeout = 10 })
      if r == nil then error(err, 0) end

      local items, seen = {}, {}
      local function add(path)
        if seen[path] then return end
        seen[path] = true
        items[#items + 1] = { id = path, title = basename(path), subtitle = tilde(path), icon = "folder" }
      end
      for _, b in ipairs(BOOKMARKS) do add(b) end
      for line in r.stdout:gmatch("[^\n]+") do add((line:gsub("/%.git$", ""))) end

      dir = rex.ui.pick{ title = "Open project", placeholder = "Filter projects", items = items }
      if dir == nil then return end
    end
    -- tms naming: dots become underscores
    open_session(ctx, (basename(dir):gsub("%.", "_")), dir)
  end,
}

rex.action{
  name  = "clone_repo",
  title = "Clone Repository…",
  args  = { url = "string?" },
  run   = function(ctx, args)
    local url = args.url or rex.ui.input{ title = "Clone repository", placeholder = "Paste remote Git url..." }
    if url == nil or url == "" then return end
    local dest = HOME .. "/coding/" .. (basename(url):gsub("%.git$", ""))
    local _, err = rex.session.new_layer{
      bounds = { 0.15, 0.35, 0.7, 0.3 },
      focus  = true,
      layout = rex.layout.block{
        flavor  = SHELL,
        options = { command = { "git", "clone", url, dest }, exit = { on_completion = false } },
      },
    }
    if err ~= nil then error(err, 0) end
  end,
}

rex.action{
  name  = "confirm_close_tab",
  title = "Close Tab (Confirm)",
  run   = function()
    if confirm("Kill this tab?") then rex.client.queue("client.tab.close") end
  end,
}

rex.action{
  name  = "confirm_close_session",
  title = "Close Session (Confirm)",
  run   = function()
    if confirm("Kill current session?") then rex.client.queue("session.close") end
  end,
}

-- Pane controls

for _, dir in ipairs({ "left", "down", "up", "right" }) do
  rex.bind("alt+shift+" .. dir, "pane.resize", { direction = dir })
end
rex.bind("alt+home", "pane.split.down")
rex.bind("alt+end", "pane.split.right")

-- Tabs (tmux windows)

for i = 1, 5 do
  rex.bind("alt+" .. i, "client.tab.goto", { index = i })
end
rex.bind("alt+n", "shell_tab")
rex.bind("alt+m", "nvim_tab")
rex.bind("alt+,", "agent_tab")

-- Sessions

rex.bind("alt+d", "toggle_default_session")
rex.bind("alt+o", "last_session")
rex.bind("alt+j", "project_open")
rex.bind("alt+s", "session_pick")
rex.bind("alt+c", "clone_repo")

-- Prefix for destructive and rare actions

rex.bind("ctrl+b>r", "client.tab.rename")
rex.bind("ctrl+b>shift+r", "session.rename")
rex.bind("ctrl+b>ctrl+b", "pane.send_key", { key = "ctrl+b" })
