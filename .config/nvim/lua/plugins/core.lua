return {
    -- { "olimorris/onedarkpro.nvim" },
    {
        "folke/tokyonight.nvim",
        lazy = false,
        priority = 1000,
        opts = {},
    },

    {
        "LazyVim/LazyVim",
        opts = {
            colorscheme = "tokyonight-storm",
        },
    },

    {
        "neovim/nvim-lspconfig",
        opts = {
            inlay_hints = { enabled = false },
            diagnostics = { virtual_text = false },
        },
    },

    {
        "folke/trouble.nvim",
        opts = {
            auto_close = false,
            restore = true,
            modes = {
                diagnostics = {
                    auto_open = true,
                },
            },
        },
    },

    {
        "folke/snacks.nvim",
        ---@type snacks.Config
        opts = {
            dashboard = {
                sections = {
                    { section = "header" },
                    { section = "keys", gap = 1, padding = 1 },
                    { section = "startup" },
                },
            },
        },
    },

    {
        "numToStr/Comment.nvim",
        opts = {
            -- add any options here
        },
    },
}
