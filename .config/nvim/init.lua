if vim.g.neovide then
    vim.g.neovide_padding_top = 5
    vim.g.neovide_padding_left = 10
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

-- vim.opt.spell = true
-- vim.opt.spelllang = { "de_de", "en_us" }

-- vim.g.UltiSnipsSnippetDirectories = [$HOME."/.config/nvim/UltiSnips"]

require("config.lazy")
