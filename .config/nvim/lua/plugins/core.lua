return {
    {
        "folke/tokyonight.nvim",
        lazy = false,
        priority = 1000,
        opts = {},
    },

    { "catppuccin/nvim", name = "catppuccin", priority = 1000 },

    {
        "LazyVim/LazyVim",
        opts = {
            -- colorscheme = "tokyonight-storm",
            colorscheme = "catppuccin-macchiato",
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
            auto_close = true,
            restore = true,
        },
        keys = {
            {
                "<leader>xx",
                "<cmd>Trouble diagnostics toggle<cr>",
                desc = "Toggle diagnostics (Trouble)",
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
            picker = {
                sources = {
                    files = { hidden = true },
                    grep = { hidden = true },
                    explorer = {
                        hidden = true,
                        jump = { close = true },
                        layout = {
                            preset = "sidebar",
                            preview = false,
                            layout = {
                                position = "float",
                                col = 0,
                                row = 0,
                                width = 40,
                                min_width = 40,
                                height = 0, -- 0 = full height
                                border = true,
                            },
                        },
                    },
                },
            },
        },
        keys = {
            {
                "ff",
                function()
                    Snacks.picker.files()
                end,
                desc = "Find files",
            },
            {
                "fg",
                function()
                    Snacks.picker.grep()
                end,
                desc = "Grep files",
            },
            {
                "fz",
                function()
                    Snacks.picker.grep()
                end,
                desc = "Fuzzy grep",
            },
            {
                "fc",
                function()
                    Snacks.picker.grep_word()
                end,
                desc = "Search current word",
            },
        },
    },

    {
        "numToStr/Comment.nvim",
        opts = {
            -- add any options here
        },
    },

    {
        "stevearc/conform.nvim",
        opts = {
            formatters_by_ft = {
                typescript = { "prettier" },
                typescriptreact = { "prettier" },
            },
        },
    },

    {
        "nvim-lualine/lualine.nvim",
        dependencies = { "nvim-tree/nvim-web-devicons" },
        opts = {
            sections = {
                lualine_x = { "location" },
                lualine_y = {},
                lualine_z = {},
            },
        },
    },
}
