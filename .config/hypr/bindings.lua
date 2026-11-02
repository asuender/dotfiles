-- Personal overrides on top of Omarchy's defaults.

-- Multi-monitor: SUPER + number brings the workspace to the focused monitor.
for workspace = 1, 10 do
  local key = "SUPER + code:" .. tostring(workspace + 9)
  hl.unbind(key)
  o.bind(key, "Switch to workspace " .. workspace, hl.dsp.focus({
    workspace = tostring(workspace),
    on_current_monitor = true,
  }))
end
