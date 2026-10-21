CREATE OR ALTER PROCEDURE dbo.usp_Tarea_Crear
    @Titulo       VARCHAR(150),
    @Descripcion  VARCHAR(500) = NULL,
    @FechaInicio  DATETIME,
    @FechaFin     DATETIME     = NULL,
    @CategoriaId  INT,
    @Estado       VARCHAR(20)  = 'PENDIENTE',
    @NuevoId      INT          = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- 1. Validar que la categoría exista y esté activa
    IF NOT EXISTS (
        SELECT 1
        FROM dbo.CategoriaTarea
        WHERE Id = @CategoriaId
          AND Activo = 1
    )
    BEGIN
        DECLARE @Msg NVARCHAR(200) =
            CONCAT(N'La categoría con Id ', @CategoriaId, N' no existe o no está activa.');
        THROW 50001, @Msg, 1;
    END;

    -- 2. Validación opcional de fechas
    IF @FechaFin IS NOT NULL AND @FechaFin < @FechaInicio
        THROW 50002, N'La FechaFin no puede ser menor que la FechaInicio.', 1;

    -- 3. Insertar y capturar el Id generado
    DECLARE @Ids TABLE (Id INT);

    BEGIN TRY
        BEGIN TRANSACTION;

        INSERT INTO dbo.Tarea (Titulo, Descripcion, FechaInicio, FechaFin, CategoriaId, Estado)
        OUTPUT INSERTED.Id INTO @Ids (Id)
        VALUES (@Titulo, @Descripcion, @FechaInicio, @FechaFin, @CategoriaId, @Estado);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;

    SELECT @NuevoId = Id FROM @Ids;

    -- Retorna el Id como resultado (además del parámetro OUTPUT)
    SELECT @NuevoId AS Id;
END;
GO
