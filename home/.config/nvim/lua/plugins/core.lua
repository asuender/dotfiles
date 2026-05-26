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
        "nickjvandyke/opencode.nvim",
        version = "*", -- Latest stable release
        dependencies = {
            {
                -- `snacks.nvim` integration is recommended, but optional
                ---@module "snacks" <- Loads `snacks.nvim` types for configuration intellisense
                "folke/snacks.nvim",
                optional = true,
                opts = {
                    input = {}, -- Enhances `ask()`
                    picker = { -- Enhances `select()`
                        actions = {
                            opencode_send = function(...)
                                return require("opencode").snacks_picker_send(
                                    ...
                                )
                            end,
                        },
                        win = {
                            input = {
                                keys = {
                                    ["<a-a>"] = {
                                        "opencode_send",
                                        mode = { "n", "i" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        config = function()
            ---@type opencode.Opts
            vim.g.opencode_opts = {
                -- Your configuration, if any; goto definition on the type or field for details
            }

            vim.o.autoread = true -- Required for `opts.events.reload`

            -- Recommended/example keymaps
            vim.keymap.set({ "n", "x" }, "<C-a>", function()
                require("opencode").ask("@this: ", { submit = true })
            end, { desc = "Ask opencode…" })
            vim.keymap.set({ "n", "x" }, "<C-x>", function()
                require("opencode").select()
            end, { desc = "Execute opencode action…" })
            vim.keymap.set({ "n", "t" }, "<C-.>", function()
                require("opencode").toggle()
            end, { desc = "Toggle opencode" })

            vim.keymap.set({ "n", "x" }, "go", function()
                return require("opencode").operator("@this ")
            end, { desc = "Add range to opencode", expr = true })
            vim.keymap.set("n", "goo", function()
                return require("opencode").operator("@this ") .. "_"
            end, { desc = "Add line to opencode", expr = true })

            vim.keymap.set("n", "<S-C-u>", function()
                require("opencode").command("session.half.page.up")
            end, { desc = "Scroll opencode up" })
            vim.keymap.set("n", "<S-C-d>", function()
                require("opencode").command("session.half.page.down")
            end, { desc = "Scroll opencode down" })

            -- You may want these if you use the opinionated `<C-a>` and `<C-x>` keymaps above — otherwise consider `<leader>o…` (and remove terminal mode from the `toggle` keymap)
            vim.keymap.set(
                "n",
                "+",
                "<C-a>",
                { desc = "Increment under cursor", noremap = true }
            )
            vim.keymap.set(
                "n",
                "-",
                "<C-x>",
                { desc = "Decrement under cursor", noremap = true }
            )
        end,
    },

    {
        "dmtrKovalenko/fff.nvim",
        build = function()
            -- this will download prebuild binary or try to use existing rustup toolchain to build from source
            -- (if you are using lazy you can use gb for rebuilding a plugin if needed)
            require("fff.download").download_or_build_binary()
        end,
        -- if you are using nixos
        -- build = "nix run .#release",
        opts = { -- (optional)
            debug = {
                enabled = true, -- we expect your collaboration at least during the beta
                show_scores = true, -- to help us optimize the scoring system, feel free to share your scores!
            },
        },
        -- No need to lazy-load with lazy.nvim.
        -- This plugin initializes itself lazily.
        lazy = false,
        keys = {
            {
                "ff", -- try it if you didn't it is a banger keybinding for a picker
                function()
                    require("fff").find_files()
                end,
                desc = "FFFind files",
            },
            {
                "fg",
                function()
                    require("fff").live_grep()
                end,
                desc = "LiFFFe grep",
            },
            {
                "fz",
                function()
                    require("fff").live_grep({
                        grep = {
                            modes = { "fuzzy", "plain" },
                        },
                    })
                end,
                desc = "Live fffuzy grep",
            },
            {
                "fc",
                function()
                    require("fff").live_grep({
                        query = vim.fn.expand("<cword>"),
                    })
                end,
                desc = "Search current word",
            },
        },

        {
            "dmtrKovalenko/fff.nvim",
            build = function()
                -- this will download prebuild binary or try to use existing rustup toolchain to build from source
                -- (if you are using lazy you can use gb for rebuilding a plugin if needed)
                require("fff.download").download_or_build_binary()
            end,
            -- if you are using nixos
            -- build = "nix run .#release",
            opts = { -- (optional)
                debug = {
                    enabled = true, -- we expect your collaboration at least during the beta
                    show_scores = true, -- to help us optimize the scoring system, feel free to share your scores!
                },
            },
            -- No need to lazy-load with lazy.nvim.
            -- This plugin initializes itself lazily.
            lazy = false,
            keys = {
                {
                    "ff", -- try it if you didn't it is a banger keybinding for a picker
                    function()
                        require("fff").find_files()
                    end,
                    desc = "FFFind files",
                },
                {
                    "fg",
                    function()
                        require("fff").live_grep()
                    end,
                    desc = "LiFFFe grep",
                },
                {
                    "fz",
                    function()
                        require("fff").live_grep({
                            grep = {
                                modes = { "fuzzy", "plain" },
                            },
                        })
                    end,
                    desc = "Live fffuzy grep",
                },
                {
                    "fc",
                    function()
                        require("fff").live_grep({
                            query = vim.fn.expand("<cword>"),
                        })
                    end,
                    desc = "Search current word",
                },
            },
        },
    },
}
