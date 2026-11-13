package prontto_api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import prontto_api.domain.NotaCliente;

import java.util.List;

public interface NotaClienteRepository extends JpaRepository<NotaCliente, Long> {
    List<NotaCliente> findByClienteIdOrderByCriadaEmDesc(Long clienteId);
}
