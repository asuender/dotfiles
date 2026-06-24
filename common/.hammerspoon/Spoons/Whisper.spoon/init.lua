--- === Whisper.spoon ===
--- Push-to-talk voice dictation via a remote mlx-audio server.
--- Hold Caps Lock (remapped to Control) to record, release to transcribe
--- and paste the result into the focused app.

local obj = {}
obj.__index = obj

obj.serverURL = "http://mini-luca:8000"
obj.model = "~/models/parakeet-tdt-0.6b-v3-4bit"
obj.ffmpegPath = "/opt/homebrew/bin/ffmpeg"
obj.audioDevice = nil
obj.tmpFile = "/tmp/whisper_recording.wav"
obj.language = nil

obj._recording = false
obj._capsDown = false
obj._recordTask = nil
obj._eventtap = nil
obj._menubar = nil
obj._device = nil
obj._icons = nil

local CTRL_KEYCODES = { [57] = true, [62] = true, [63] = true }

local function alert(msg)
	hs.alert.show("Whisper: " .. msg, 2)
end

local function setMenubar(state)
	if obj._menubar and obj._icons then
		obj._menubar:setIcon(obj._icons[state] or obj._icons.idle)
	end
end

local function fail(msg)
	alert(msg)
	setMenubar("idle")
end

local function pasteText(text)
	local old = hs.pasteboard.getContents()
	hs.pasteboard.setContents(text)
	hs.timer.doAfter(0.05, function()
		hs.eventtap.keyStroke({ "cmd" }, "v")
	end)
	hs.timer.doAfter(0.5, function()
		if old then
			hs.pasteboard.setContents(old)
		else
			hs.pasteboard.clearContents()
		end
	end)
end

local function makeIcons()
	local function circle(action, extra)
		local e = {
			type = "circle",
			center = { x = "50%", y = "50%" },
			radius = "38%",
			action = action,
			fillColor = { white = 1.0 },
			strokeColor = { white = 1.0 },
		}
		for k, v in pairs(extra or {}) do
			e[k] = v
		end
		return e
	end

	local function img(elements)
		local c = hs.canvas.new({ w = 18, h = 18 })
		for i, e in ipairs(elements) do
			c[i] = e
		end
		local image = c:imageFromCanvas()
		c:delete()
		return image
	end

	return {
		idle = img({ circle("stroke", { strokeWidth = 1.5 }) }),
		recording = img({
			circle("fill"),
			{
				type = "rectangle",
				frame = { x = "50%", y = "0%", w = "50%", h = "100%" },
				action = "fill",
				fillColor = { white = 1.0 },
				compositeRule = "destinationOut",
			},
		}),
		transcribing = img({ circle("fill") }),
	}
end

local function detectAudioDevice()
	if obj.audioDevice then
		return obj.audioDevice
	end
	if obj._device then
		return obj._device
	end
	local out = hs.execute(obj.ffmpegPath .. ' -nostdin -hide_banner -f avfoundation -list_devices true -i "" 2>&1')
	for line in (out or ""):gmatch("[^\r\n]+") do
		local idx, name = line:match("%[AVFoundation indev.+%]%s+%[(%d+)%]%s+(.+)")
		if idx and name:lower():match("microphone") then
			obj._device = ":" .. idx
			return obj._device
		end
	end
	obj._device = ":1"
	return obj._device
end

local function transcribe()
	setMenubar("transcribing")

	local f = io.open(obj.tmpFile, "rb")
	if not f then
		return fail("recording file not found")
	end
	local fileData = f:read("*a")
	f:close()

	local boundary = "WhisperBoundary" .. math.random(100000, 999999)
	local parts = {
		"--" .. boundary .. "\r\n"
			.. 'Content-Disposition: form-data; name="model"\r\n\r\n'
			.. obj.model .. "\r\n",
		"--" .. boundary .. "\r\n"
			.. 'Content-Disposition: form-data; name="response_format"\r\n\r\n'
			.. "json\r\n",
		"--" .. boundary .. "\r\n"
			.. 'Content-Disposition: form-data; name="file"; filename="recording.wav"\r\n'
			.. "Content-Type: audio/wav\r\n\r\n"
			.. fileData .. "\r\n"
			.. "--" .. boundary .. "--\r\n",
	}
	if obj.language then
		table.insert(parts, 2, "--" .. boundary .. "\r\n"
			.. 'Content-Disposition: form-data; name="language"\r\n\r\n'
			.. obj.language .. "\r\n")
	end

	hs.http.asyncPost(
		obj.serverURL .. "/v1/audio/transcriptions",
		table.concat(parts),
		{ ["Content-Type"] = "multipart/form-data; boundary=" .. boundary },
		function(code, body)
			if code ~= 200 then
				return fail("server request failed (" .. tostring(code) .. ")")
			end
			local decoded = hs.json.decode(body or "")
			if not decoded then
				return fail("invalid response from server")
			end
			if decoded.error or decoded.detail then
				return fail(tostring(decoded.error or decoded.detail))
			end
			local text = (decoded.text or ""):match("^%s*(.-)%s*$")
			if text == "" then
				return fail("no transcription returned")
			end
			pasteText(text)
			setMenubar("idle")
		end
	)
end

local function startRecording()
	if obj._recording then
		return
	end
	if not hs.fs.attributes(obj.ffmpegPath) then
		return alert("ffmpeg not found")
	end

	os.remove(obj.tmpFile)
	obj._recording = true
	setMenubar("recording")

	local device = detectAudioDevice()
	obj._recordTask = hs.task.new(obj.ffmpegPath, function()
		obj._recordTask = nil
		obj._recording = false
		local attrs = hs.fs.attributes(obj.tmpFile)
		if not attrs or attrs.size < 1000 then
			return setMenubar("idle")
		end
		transcribe()
	end, {
		"-nostdin", "-hide_banner", "-loglevel", "error",
		"-f", "avfoundation", "-i", device,
		"-ar", "16000", "-ac", "1", "-y", obj.tmpFile,
	})
	obj._recordTask:setStreamingCallback(function()
		return true
	end)
	if not obj._recordTask:start() then
		obj._recordTask = nil
		obj._recording = false
		alert("failed to start recording")
		setMenubar("idle")
	end
end

local function stopRecording()
	if not obj._recording or not obj._recordTask then
		return
	end
	local pid = obj._recordTask:pid()
	if pid and pid > 0 then
		os.execute("kill -INT " .. pid)
	else
		obj._recordTask:terminate()
	end
end

local function handleFlagsChanged(event)
	if not CTRL_KEYCODES[event:getKeyCode()] then
		return false
	end
	local isDown = event:getFlags().ctrl or event:getFlags().capsLock
	if isDown and not obj._capsDown then
		obj._capsDown = true
		startRecording()
	elseif not isDown and obj._capsDown then
		obj._capsDown = false
		stopRecording()
	end
	return false
end

function obj:start()
	if not hs.fs.attributes(obj.ffmpegPath) then
		return alert("ffmpeg not found")
	end
	if not obj._icons then
		obj._icons = makeIcons()
	end
	if not obj._menubar then
		obj._menubar = hs.menubar.new()
		obj._menubar:setIcon(obj._icons.idle)
		obj._menubar:setTooltip("Whisper dictation")
	end
	if not obj._eventtap then
		obj._eventtap = hs.eventtap.new({ hs.eventtap.event.types.flagsChanged }, handleFlagsChanged)
	end
	obj._eventtap:start()
	detectAudioDevice()
	return obj
end

return obj
