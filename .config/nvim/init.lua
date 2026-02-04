if vim.g.neovide then
    vim.g.neovide_padding_top = 5
    -- from https://github.com/neovide/neovide/issues/1263
    vim.keymap.set(
        { "n", "v", "s", "x", "o", "i", "l", "c", "t" },
        "<D-v>",
        function()
            vim.api.nvim_paste(vim.fn.getreg("+"), true, -1)
        end,
        { noremap = true, silent = true }
    )
end

-- vim.g.UltiSnipsSnippetDirectories = [$HOME."/.config/nvim/UltiSnips"]

require("config.lazy")
